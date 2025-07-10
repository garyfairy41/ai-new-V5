import toast from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'info' | 'loading';

type ToastOptions = {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  id?: string;
};

/**
 * Shows a toast notification with consistent styling
 * @param message The message to display
 * @param type The type of toast (success, error, info, loading)
 * @param options Additional options for the toast
 * @returns The toast ID that can be used for updating or dismissing
 */
export const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
  const { duration = 4000, position = 'bottom-right', id } = options || {};
  
  // Avoid duplicate toasts for the same action
  if (id) {
    toast.dismiss(id);
  }
  
  if (type === 'success') {
    return toast.success(message, { duration, position, id });
  } else if (type === 'error') {
    return toast.error(message, { duration: 5000, position, id }); // Errors show longer
  } else if (type === 'loading') {
    return toast.loading(message, { position, id });
  } else {
    return toast(message, { duration, position, id });
  }
};

/**
 * Updates an existing toast (useful for loading -> success/error transitions)
 * @param id The toast ID to update
 * @param message The new message
 * @param type The new toast type
 */
export const updateToast = (id: string, message: string, type: Exclude<ToastType, 'loading'>) => {
  if (type === 'success') {
    toast.success(message, { id });
  } else if (type === 'error') {
    toast.error(message, { id });
  } else {
    toast(message, { id });
  }
};

/**
 * Promise toast - shows loading while promise is pending, then success/error
 * @param promise The promise to track
 * @param messages Messages to show for loading/success/error states
 * @returns The original promise (passthrough)
 */
export const promiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string | ((err: any) => string);
  }
) => {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => typeof messages.error === 'function' ? messages.error(err) : messages.error,
  });
  
  return promise;
};
