// @ts-nocheck
import { MAX } from "@/constants/app.constants";
import * as Yup from "yup";

export const translateSchema = Yup.object({
  text: Yup.string()
    .trim()
    .max(MAX, `Text cannot exceed ${MAX.toLocaleString()} characters`)
    // .test("not-empty", "Text is required for translation", function (value) {
    //   if (this.parent.inputMode === "text") {
    //     return !!value && value.trim().length > 0;
    //   }
    //   return true;
    // }),
    .optional(),
  sourceLang: Yup.object({
    code: Yup.string().required("Language code is required"),
    name: Yup.string().required("Language name is required"),
  }).required("Source language is required"),
  targetLang: Yup.object({
    code: Yup.string().required("Language code is required"),
    name: Yup.string().required("Language name is required"),
  }).required("Target language is required"),
  inputMode: Yup.string()
    .oneOf(
      ["text", "document", "website", "voice", "image"],
      "Invalid input mode",
    )
    .required("Input mode is required"),
});
