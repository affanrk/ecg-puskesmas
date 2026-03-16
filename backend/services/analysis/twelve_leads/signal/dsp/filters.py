import scipy.signal
import numpy as np
import pywt
from functools import lru_cache
from utils import logger


def desaturate_edges(x):
    ADC_EDGE = 0.95 * (2**23 - 1)
    x = np.asarray(x, dtype=float)
    mask = np.abs(x) >= ADC_EDGE
    xi = x.copy()
    if np.any(mask):
        idx = np.arange(len(x))
        xi[mask] = np.interp(idx[mask], idx[~mask], x[~mask])
    return xi


def despike_hampel(x, k=7, nsigma=6.0):
    x = np.asarray(x, dtype=float)
    med = scipy.signal.medfilt(x, kernel_size=2 * k + 1)
    diff = np.abs(x - med)
    mad = scipy.signal.medfilt(diff, kernel_size=2 * k + 1)
    mad = np.maximum(mad, 1e-12)
    mask = diff > (nsigma * 1.4826 * mad)
    xi = x.copy()
    if np.any(mask):
        idx = np.arange(len(x))
        xi[mask] = np.interp(idx[mask], idx[~mask], x[~mask])
    return xi


@lru_cache(maxsize=10)
def get_iec_coeffs(fs: int):
    nyquist = fs / 2.0

    hp_cutoff = min(0.05 / nyquist, 0.99)
    b_hp, a_hp = scipy.signal.butter(4, hp_cutoff, btype="highpass")

    lp_cutoff = min(150 / nyquist, 0.99)
    b_lp, a_lp = scipy.signal.butter(4, lp_cutoff, btype="lowpass")

    f0 = 50.0
    Q = 30.0
    if f0 < nyquist:
        w0 = f0 / nyquist
        b_notch, a_notch = scipy.signal.iirnotch(w0, Q)
    else:
        b_notch, a_notch = None, None

    return (b_hp, a_hp), (b_lp, a_lp), (b_notch, a_notch)


def apply_iec_diagnostic_filter(signal: np.ndarray, fs: int) -> np.ndarray:
    pad_len = int(fs * 2)
    if len(signal) <= pad_len:
        pad_len = len(signal) // 2

    padded_signal = np.pad(signal, (pad_len, pad_len), mode="edge")
    (b_hp, a_hp), (b_lp, a_lp), (b_notch, a_notch) = get_iec_coeffs(fs)

    sig = scipy.signal.filtfilt(b_hp, a_hp, padded_signal)
    sig = scipy.signal.filtfilt(b_lp, a_lp, sig)
    if b_notch is not None:
        sig = scipy.signal.filtfilt(b_notch, a_notch, sig)

    return sig[pad_len:-pad_len]


@lru_cache(maxsize=1)
def get_wavelet(name="sym6"):
    return pywt.Wavelet(name)


def wavelet_denoise(x, fs, wavelet_name="sym6"):
    x = np.asarray(x, dtype=float)
    w = get_wavelet(wavelet_name)
    maxlev = pywt.dwt_max_level(len(x), w.dec_len)
    level = min(5, maxlev)

    coeffs = pywt.wavedec(x, w, mode="symmetric", level=level)
    cA, details = coeffs[0], coeffs[1:]
    new_coeffs = [cA]

    protect_band = (1.0, 40.0)

    for i, cD in enumerate(details, start=1):
        f_low, f_high = fs / (2.0 ** (i + 1)), fs / (2.0**i)
        sigma = (np.median(np.abs(cD - np.median(cD))) / 0.6745) + 1e-12
        thr_univ = sigma * np.sqrt(2.0 * np.log(max(cD.size, 2)))

        if f_high <= 2.0:
            cD_th = cD
        else:
            overlaps = (f_low <= protect_band[1]) and (f_high >= protect_band[0])
            thr = thr_univ * (0.5 if overlaps else 1.0)
            cD_th = pywt.threshold(cD, thr, mode="soft")
        new_coeffs.append(cD_th)

    y = pywt.waverec(new_coeffs, w, mode="symmetric")
    return y[: len(x)]


def apply_filters(signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    logger.debug("[DSP-Filters] Starting apply_filters...")
    try:
        sig = np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)

        sig = desaturate_edges(sig)

        sig = despike_hampel(sig)

        sig = apply_iec_diagnostic_filter(sig, sampling_rate)

        result = wavelet_denoise(sig, sampling_rate)
        logger.debug("[DSP-Filters] Successfully completed apply_filters.")
        return result

    except Exception as e:
        logger.error(f"[DSP-Filters] Full filter application failed: {e}")
        return signal
