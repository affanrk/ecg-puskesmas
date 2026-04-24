'use client';

import { LocationCreatePayload } from '@/types/user';
import { X } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import { locationTypeOptions } from '@/data';

interface LocationFormModalProps {
    mode: 'create' | 'edit';
    formData: LocationCreatePayload;
    errors: Record<string, string>;
    isSubmitting: boolean;
    provinceOptions: Array<{ value: string; label: string }>;
    cityOptions: Array<{ value: string; label: string }>;
    districtOptions: Array<{ value: string; label: string }>;
    villageOptions: Array<{ value: string; label: string }>;
    regionLoading: {
        provinces: boolean;
        cities: boolean;
        districts: boolean;
        villages: boolean;
    };
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onFieldChange: (field: string, value: string) => void;
    onProvinceChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onDistrictChange: (value: string) => void;
}

export default function LocationFormModal({
    mode,
    formData,
    errors,
    isSubmitting,
    provinceOptions,
    cityOptions,
    districtOptions,
    villageOptions,
    regionLoading,
    onClose,
    onSubmit,
    onFieldChange,
    onProvinceChange,
    onCityChange,
    onDistrictChange
}: LocationFormModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                        {mode === 'create' ? 'Register New Location' : 'Edit Location'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer p-1 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
                    <StandardInput
                        label="Location Name"
                        required
                        value={formData.name}
                        onChange={(e) => onFieldChange('name', e.target.value)}
                        placeholder="e.g. Puskesmas Menteng"
                        errorMessage={errors.name}
                    />
                    <SelectInput
                        label="Location Type"
                        required
                        value={formData.location_type}
                        onChange={(e) => onFieldChange('location_type', e.target.value)}
                        options={[
                            { value: '', label: 'Select Type...' },
                            ...locationTypeOptions
                        ]}
                        errorMessage={errors.location_type}
                    />
                    <StandardInput
                        label="Full Address"
                        required
                        value={formData.address}
                        onChange={(e) => onFieldChange('address', e.target.value)}
                        placeholder="e.g. Jl. Menteng Raya No. 1"
                        errorMessage={errors.address}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <SelectInput
                            label="Province"
                            required
                            value={formData.province || ''}
                            onChange={(e) => onProvinceChange(e.target.value)}
                            options={[
                                { value: '', label: regionLoading.provinces ? 'Loading...' : 'Select Province...' },
                                ...provinceOptions
                            ]}
                            disabled={regionLoading.provinces}
                            errorMessage={errors.province}
                        />
                        <SelectInput
                            label="City / Kabupaten"
                            required
                            value={formData.city || ''}
                            onChange={(e) => onCityChange(e.target.value)}
                            options={[
                                { value: '', label: regionLoading.cities ? 'Loading...' : 'Select City...' },
                                ...cityOptions
                            ]}
                            disabled={!formData.province || regionLoading.cities}
                            errorMessage={errors.city}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SelectInput
                            label="Kecamatan"
                            value={formData.kecamatan || ''}
                            onChange={(e) => onDistrictChange(e.target.value)}
                            options={[
                                { value: '', label: regionLoading.districts ? 'Loading...' : 'Select Kecamatan...' },
                                ...districtOptions
                            ]}
                            disabled={!formData.city || regionLoading.districts}
                        />
                        <SelectInput
                            label="Kelurahan / Desa"
                            value={formData.kelurahan || ''}
                            onChange={(e) => onFieldChange('kelurahan', e.target.value)}
                            options={[
                                { value: '', label: regionLoading.villages ? 'Loading...' : 'Select Kelurahan...' },
                                ...villageOptions
                            ]}
                            disabled={!formData.kecamatan || regionLoading.villages}
                        />
                    </div>

                    <StandardInput
                        label="Phone Number"
                        value={formData.phone || ''}
                        onChange={(e) => onFieldChange('phone', e.target.value)}
                        placeholder="e.g. 02131000001"
                        errorMessage={errors.phone}
                    />
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin cursor-not-allowed" />
                                    Processing...
                                </>
                            ) : (
                                mode === 'create' ? 'Review & Create' : 'Update Location'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
