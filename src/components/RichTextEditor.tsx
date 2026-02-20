import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const modules = {
  toolbar: [
    ["bold"],
    [{ align: [] }],
    [{ list: "bullet" }, { list: "ordered" }],
    ["clean"],
  ],
};

const formats = ["bold", "align", "list"];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <SectionErrorBoundary componentName="RichTextEditor">
      <div className={className}>
        <div className="rounded-md border border-input bg-background">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            formats={formats}
            readOnly={disabled}
          />
        </div>
      </div>
    </SectionErrorBoundary>
  );
};

export default RichTextEditor;