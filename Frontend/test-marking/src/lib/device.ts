import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'omr_device_id';

/**
 * Lấy Device ID ổn định từ localStorage.
 * Nếu chưa có thì tự động tạo UUID mới và lưu lại.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
