"""
Enhanced logging configuration for ECG Live Platform.
Provides structured logging with context, formatting, and file support.
"""

import logging
import sys
import os
import time
from typing import Optional
from pathlib import Path

from utils.constants import LOG_FORMAT, LOG_DATE_FORMAT


class ContextLogger(logging.Logger):
    """
    Enhanced logger with context support.
    Allows adding contextual information (like device_id, recording_id) to log messages.

    Usage:
        logger.set_context(device_id="ECG001", recording_id="123")
        logger.info("Processing data")
        logger.clear_context()
    """

    def __init__(self, name: str):
        super().__init__(name)
        self._context = {}

    def set_context(self, **kwargs):
        """
        Add context that will be included in all subsequent log messages.

        Args:
            **kwargs: Key-value pairs to add to context

        Example:
            logger.set_context(device_id="ECG001", user="operator")
        """
        self._context.update(kwargs)

    def clear_context(self, *keys):
        """
        Clear context. If keys provided, only clear those keys.

        Args:
            *keys: Specific keys to remove (if empty, clears all)

        Example:
            logger.clear_context()
            logger.clear_context("device_id")
        """
        if keys:
            for key in keys:
                self._context.pop(key, None)
        else:
            self._context.clear()

    def get_context(self) -> dict:
        """Get current context dictionary"""
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
        """Override to inject context into all log messages"""
        if extra is None:
            extra = {}
        extra.update(self._context)
        super()._log(level, msg, args, exc_info, extra, stack_info, stacklevel + 1)


class ColoredFormatter(logging.Formatter):
    """
    Colored console formatter for better readability.
    Only applies colors to console output, not file logs.
    """

    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
        "RESET": "\033[0m",
    }

    def format(self, record):
        """Add colors to log level"""
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
    """
    Configure application logger.

    Args:
        name: Logger name (default: "ECG-Platform")
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
               Can also be set via LOG_LEVEL environment variable
        log_file: Optional file path for file logging
        use_colors: Whether to use colored output in console

    Returns:
        Configured ContextLogger instance

    Example:

        logger = setup_logger()

        logger = setup_logger(log_file="logs/app.log")

        logger = setup_logger(level="DEBUG")
    """

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
    """
    Get or create a logger instance.

    Args:
        name: Logger name

    Returns:
        ContextLogger instance

    Example:
        from utils.logger import get_logger

        logger = get_logger("MyModule")
        logger.info("Starting process")
    """
    logging.setLoggerClass(ContextLogger)
    return logging.getLogger(name)


def configure_library_loggers():
    """
    Configure third-party library loggers to reduce noise.
    Call this during application startup.
    """

    logging.getLogger("aiomqtt").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("matplotlib").setLevel(logging.WARNING)
    logging.getLogger("tensorflow").setLevel(logging.ERROR)
    logging.getLogger("h5py").setLevel(logging.WARNING)


logger = setup_logger()

configure_library_loggers()


def log_function_call(func):
    """
    Decorator to log function calls with parameters.
    Useful for debugging.

    Usage:
        @log_function_call
        def my_function(arg1, arg2):
            return arg1 + arg2
    """

    def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        logger.debug(f"{func.__name__} returned: {result}")
        return result

    return wrapper


def log_performance(func):
    """
    Decorator to log function execution time.

    Usage:
        @log_performance
        def slow_function():
            time.sleep(1)
    """

    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start

        logger.info(f"{func.__name__} completed in {duration:.3f}s")
        return result

    return wrapper
