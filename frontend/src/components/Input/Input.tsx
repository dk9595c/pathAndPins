import React from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  name?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  disabled = false,
  name,
}) => {
  return (
    <div className="custom-input">
      {label && <label htmlFor={name}>{label}</label>}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
    </div>
  );
};

export default Input;
