// @ts-nocheck
import { AxiosError } from "axios";

export const getErrorMessage = (error: unknown, fallback?: string): string => {
  if (error instanceof AxiosError) {
    return (
      error.response?.data.message ||
      error.response?.data.error ||
      error.message ||
      fallback ||
      "An unknown error occurred"
    );
  }

  return String(error);
};
