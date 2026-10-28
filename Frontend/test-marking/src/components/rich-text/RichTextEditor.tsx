import { useEffect, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMceEditor } from "tinymce";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/skins/content/default/content.css";
import "tinymce/skins/ui/oxide/content.css";
import { uploadQuestionBankRichTextImage } from "@/features/questions/questionBanks.api";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
}

async function uploadRichTextBlob(blob: Blob, filename = "rich-text-image.png") {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  const url = await uploadQuestionBankRichTextImage(file);
  return resolveServerImageUrl(url);
}

export function RichTextEditor({ value, onChange, minHeight = 180 }: RichTextEditorProps) {
  const editorRef = useRef<TinyMceEditor | null>(null);
  const initialValueRef = useRef(value);
  const lastExternalValueRef = useRef(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastExternalValueRef.current) return;

    lastExternalValueRef.current = value;
    if (editor.getContent() !== value) {
      editor.setContent(value || "");
    }
  }, [value]);

  return (
    <Editor
      licenseKey="gpl"
      initialValue={initialValueRef.current}
      onInit={(_, editor) => {
        editorRef.current = editor;
      }}
      onEditorChange={(content) => {
        lastExternalValueRef.current = content;
        onChange(content);
      }}
      init={{
        height: minHeight,
        menubar: false,
        branding: false,
        promotion: false,
        plugins: "lists table code link image",
        toolbar:
          "undo redo | blocks | bold italic underline | bullist numlist | table link image | code",
        automatic_uploads: true,
        paste_data_images: true,
        relative_urls: false,
        remove_script_host: false,
        convert_urls: false,
        images_upload_handler: async (blobInfo) => {
          return uploadRichTextBlob(blobInfo.blob(), blobInfo.filename() || "rich-text-image.png");
        },
        file_picker_types: "image",
        image_uploadtab: false,
        image_description: false,
        file_picker_callback: (callback, _value, meta) => {
          if (meta.filetype !== "image") return;

          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/png,image/jpeg,image/webp";
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;

            void uploadQuestionBankRichTextImage(file).then((url) => {
              callback(resolveServerImageUrl(url), { title: file.name, alt: file.name });
            });
          };
          input.click();
        },
        content_style:
          "body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; } img { max-width: 100%; height: auto; }",
        skin: false,
        content_css: false,
      }}
    />
  );
}
