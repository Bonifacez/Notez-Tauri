import logging
import time
from concurrent_log_handler import ConcurrentRotatingFileHandler

def setup_logger(log_file="app.log", log_level=logging.INFO, log_format=None):
    if log_format is None:
        log_format = "%(asctime)s [%(levelname)s %(process)d:%(threadName)s %(module)s:%(lineno)d] %(message)s"

    # 创建日志处理器
    handler = ConcurrentRotatingFileHandler(log_file, "a", maxBytes=10 * 1024 * 1024, backupCount=5)
    handler.setFormatter(logging.Formatter(log_format))

    # 获取根日志记录器并添加处理器
    logger = logging.getLogger()
    logger.setLevel(log_level)
    logger.addHandler(handler)

    return logger


if __name__ == "__main__":
    setup_logger(log_file="test.log")
    logger = logging.getLogger(__name__)
    for _ in range(100):
        logger.info("test")
        logger.error("test")
        logger.warning("test")
