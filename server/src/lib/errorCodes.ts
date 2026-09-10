// backend/src/lib/errorCodes.ts
// Central registry shared with the frontend. Messages mirror the exact wording
// the UI already showed locally, so nothing looks different to the user.
export const ERROR_CODES = {
  INVALID_CREDENTIALS: "No account found with that email.",
  INCORRECT_PASSWORD: "Incorrect password.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact Super Admin.",
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "Your account role doesn't include permission for this section.",
  TOKEN_EXPIRED: "Your session expired. Please sign in again.",
  CSRF_FAILED: "Request could not be verified. Please refresh and try again.",
  WEAK_PASSWORD: "Password must be at least 10 characters with upper, lower and a digit.",

  ORDER_ALREADY_PLACED: "Only one meal per day is allowed — today's meal is already collected.",
  MEAL_LIMIT_REACHED: "Today's meal limit has been reached. Please contact the Manager.",
  NOT_FIXED_MEAL_CLIENT: "Ordering is only available for Fixed Company Meal clients.",
  EMPTY_ORDER: "Add at least one item to your order.",
  ORDER_NOT_FOUND: "Order not found.",
  INVALID_STATUS_TRANSITION: "That status change isn't allowed for this order.",
  ITEM_UNAVAILABLE: "One or more items are no longer available.",
  NO_FIXED_MEAL_TODAY: "No fixed meal is set for today. Please contact the Manager.",

  INVALID_QR: "Invalid QR Code",
  EXPIRED_QR: "Expired QR Code",
  QR_REPLACED: "Invalid QR Code — this card has been replaced",
  STATION_CODE_MISMATCH: "That doesn't match the Self-Order Station code.",

  NOT_FOUND: "The requested record could not be found.",
  CLIENT_NOT_FOUND: "Client not found.",
  CLIENT_NOT_LINKED: "Your login isn't linked to a client profile yet. Contact your Super Admin.",
  MENU_ITEM_NOT_FOUND: "Menu item not found.",
  REQUEST_NOT_FOUND: "Request not found — it may have already been decided or removed.",
  DUPLICATE_EMAIL: "This email address is already in use.",
  DUPLICATE_EMPLOYEE_ID: "This Employee ID is already registered.",
  DUPLICATE_NAME: "A dish with this name already exists.",

  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  FILE_TOO_LARGE: "File is too large — please upload something under 2MB.",
  UNSUPPORTED_FILE_TYPE: "Please choose an image file (JPG, PNG or WebP).",
  UPLOAD_FAILED: "Upload failed. Please try again.",

  RATE_LIMITED: "Too many requests. Please slow down and try again shortly.",
  STORAGE_UNAVAILABLE: "File storage is temporarily unavailable. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;