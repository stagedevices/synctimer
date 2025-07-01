import { message } from 'antd';

// Simple wrapper around antd message for toast-style notifications
export const toast = {
  success(msg: string) {
    message.success(msg);
  },
  error(msg: string) {
    message.error(msg);
  },
  info(msg: string) {
    message.info(msg);
  },
  warning(msg: string) {
    message.warning(msg);
  },
};
