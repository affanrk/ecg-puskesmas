"""
Enhanced logging configuration for ECG Live Platform.
Provides structured logging with context, formatting, and file support.
"""
import logging
import sys
import os
import time # Moved from log_performance decorator
from typing import Optional
from pathlib import Path

from utils.constants import LOG_FORMAT, LOG_DATE_FORMAT


class ContextLogger(logging.Logger):
    """
    Enhanced logger with context support.
    Allows adding contextual information (like device_id, recording_id) to log messages.
    
    Usage:
        logger.set_context(device_id="ECG001", recording_id="123")
        logger.info("Processing data")  # Will include context
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
            logger.clear_context()  # Clear all
            logger.clear_context("device_id")  # Clear specific key
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
        stacklevel=1
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
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
        'RESET': '\033[0m'       # Reset
    }
    
    def format(self, record):
        """Add colors to log level"""
        if sys.stdout.isatty():  # Only color if outputting to terminal
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
    use_colors: bool = True
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
        # Basic usage
        logger = setup_logger()
        
        # With file logging
        logger = setup_logger(log_file="logs/app.log")
        
        # Debug mode
        logger = setup_logger(level="DEBUG")
    """
    # Use custom logger class
    logging.setLoggerClass(ContextLogger)
    logger = logging.getLogger(name)
    
    # Set level from parameter, environment, or default to INFO
    log_level = (
        level or 
        os.getenv("LOG_LEVEL", "INFO")
    ).upper()
    
    logger.setLevel(getattr(logging, log_level))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logger.level)
    
    # Choose formatter
    if use_colors:
        console_formatter = ColoredFormatter(
            LOG_FORMAT,
            datefmt=LOG_DATE_FORMAT
        )
    else:
        console_formatter = logging.Formatter(
            LOG_FORMAT,
            datefmt=LOG_DATE_FORMAT
        )
    
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Optional file handler
    if log_file:
        # Create logs directory if needed
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logger.level)
        
        # File logs should not be colored
        file_formatter = logging.Formatter(
            LOG_FORMAT,
            datefmt=LOG_DATE_FORMAT
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        logger.info(f"Logging to file: {log_file}")
    
    # Prevent propagation to root logger
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
    # Suppress noisy libraries
    logging.getLogger('aiomqtt').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    logging.getLogger('h5py').setLevel(logging.WARNING)


# ============================================================================
# GLOBAL LOGGER INSTANCE
# ============================================================================

# Create global logger
logger = setup_logger()

# Configure library loggers
configure_library_loggers()


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

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
        logger.debug(
            f"Calling {func.__name__} with args={args}, kwargs={kwargs}"
        )
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
    import time
    
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        
        logger.info(
            f"{func.__name__} completed in {duration:.3f}s"
        )
        return result
    return wrapper
