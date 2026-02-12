import logging
import sys
import os
import time
from typing import Optional
from pathlib import Path

from utils.constants import LOG_FORMAT, LOG_DATE_FORMAT


class ContextLogger(logging.Logger):

    def __init__(self, name: str):
        super().__init__(name)
        self._context = {}

    def set_context(self, **kwargs):

        self._context.update(kwargs)

    def clear_context(self, *keys):

        if keys:
            for key in keys:
                self._context.pop(key, None)
        else:
            self._context.clear()

    def get_context(self) -> dict:

        return self._context.copy()

    def _log(
        self,
        level,
        msg,
        args,
        exc_info=None,
        extra=None,
        stack_info=False,
        stacklevel=1,
    ):

        if extra is None:
            extra = {}
        extra.update(self._context)
        super()._log(level, msg, args, exc_info, extra, stack_info, stacklevel + 1)


class ColoredFormatter(logging.Formatter):

    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
        "RESET": "\033[0m",
    }

    def format(self, record):

        if sys.stdout.isatty():
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = (
                    f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
                )
        return super().format(record)


def setup_logger(
    name: str = "ECG-Platform",
    level: Optional[str] = None,
    log_file: Optional[str] = None,
    use_colors: bool = True,
) -> ContextLogger:

    logging.setLoggerClass(ContextLogger)
    logger = logging.getLogger(name)

    log_level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()

    logger.setLevel(getattr(logging, log_level))

    if logger.handlers:
        return logger

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logger.level)

    if use_colors:
        console_formatter = ColoredFormatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
    else:
        console_formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    if log_file:

        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logger.level)

        file_formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

        logger.info(f"Logging to file: {log_file}")

    logger.propagate = False

    return logger


def get_logger(name: str = "ECG-Platform") -> ContextLogger:

    logging.setLoggerClass(ContextLogger)
    return logging.getLogger(name)


def configure_library_loggers():

    logging.getLogger("aiomqtt").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("matplotlib").setLevel(logging.WARNING)
    logging.getLogger("tensorflow").setLevel(logging.ERROR)
    logging.getLogger("h5py").setLevel(logging.WARNING)


logger = setup_logger()

configure_library_loggers()


def log_function_call(func):

    def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        logger.debug(f"{func.__name__} returned: {result}")
        return result

    return wrapper


def log_performance(func):

    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start

        logger.info(f"{func.__name__} completed in {duration:.3f}s")
        return result

    return wrapper
