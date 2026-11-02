// @ts-nocheck
import { isAxiosError } from "axios";

export const errorHandler = (error: unknown) => {
  if (isAxiosError(error)) {
    if (error.response?.status === 503) {
      const errorData = error.response.data as {
        error?: string;
        message?: string;
      };
      const message = errorData?.message || "Service temporarily unavailable";

      return `${
        errorData?.error || "Translation service unavailable"
      }. ${message}`;
    }

    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Translation failed"
    );
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Check your network and try again";
};
