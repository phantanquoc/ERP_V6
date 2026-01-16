/**
 * Business Day Utilities
 * Company business day: 3:00 AM today to 3:00 AM tomorrow
 */

const BUSINESS_DAY_START_HOUR = parseInt(process.env.BUSINESS_DAY_START_HOUR || '3');

export interface BusinessDayRange {
  startTime: Date;
  endTime: Date;
}

/**
 * Adjust date to business day range
 * @param date - The date to adjust (can be Date object or string)
 * @returns Object with startTime and endTime
 * 
 * @example
 * // If user selects 2026-01-09
 * adjustToBusinessDay('2026-01-09')
 * // Returns:
 * // {
 * //   startTime: 2026-01-09 03:00:00,
 * //   endTime: 2026-01-10 03:00:00
 * // }
 */
export const adjustToBusinessDay = (date: Date | string): BusinessDayRange => {
  const d = new Date(date);
  
  // Set start time: BUSINESS_DAY_START_HOUR of selected date
  const startTime = new Date(d);
  startTime.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);
  
  // Set end time: BUSINESS_DAY_START_HOUR of next day
  const endTime = new Date(d);
  endTime.setDate(endTime.getDate() + 1);
  endTime.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);
  
  return { startTime, endTime };
};

/**
 * Get current business day
 * If current time is before BUSINESS_DAY_START_HOUR, return previous day
 * 
 * @example
 * // Current time: 2026-01-09 02:30:00 (before 3 AM)
 * getCurrentBusinessDay()
 * // Returns: 2026-01-08
 * 
 * // Current time: 2026-01-09 10:00:00 (after 3 AM)
 * getCurrentBusinessDay()
 * // Returns: 2026-01-09
 */
export const getCurrentBusinessDay = (): Date => {
  const now = new Date();
  
  // If current hour < BUSINESS_DAY_START_HOUR, belongs to previous day
  if (now.getHours() < BUSINESS_DAY_START_HOUR) {
    now.setDate(now.getDate() - 1);
  }
  
  // Reset to start of day
  now.setHours(0, 0, 0, 0);
  
  return now;
};

/**
 * Get business day range for current time
 * 
 * @example
 * // Current time: 2026-01-09 10:00:00
 * getCurrentBusinessDayRange()
 * // Returns:
 * // {
 * //   startTime: 2026-01-09 03:00:00,
 * //   endTime: 2026-01-10 03:00:00
 * // }
 */
export const getCurrentBusinessDayRange = (): BusinessDayRange => {
  const businessDay = getCurrentBusinessDay();
  return adjustToBusinessDay(businessDay);
};

/**
 * Format date to business day string (YYYY-MM-DD)
 */
export const formatBusinessDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

