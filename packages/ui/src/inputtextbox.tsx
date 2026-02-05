import React from 'react';

interface InputTextboxProps {
  label: string;
  labelText: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string | undefined>;
  isLoading: boolean;
  placeholder: string;
}

const InputTextbox = ({ label, labelText, type, value, onChange, errors, isLoading, placeholder }: InputTextboxProps) => {
  return (
    <div>
      <label htmlFor={label} className="block text-sm font-semibold text-gray-700 mb-2">
        {labelText}
      </label>
      <input
        id={label}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-3 text-black rounded-xl border-2 ${errors[label] ? 'border-red-500' : 'border-gray-900'} focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200`}
        placeholder={placeholder}
        disabled={isLoading}
      />
      {errors[label] && (
        <p className="mt-1.5 text-sm text-red-600">{errors[label]}</p>
      )}
    </div>
  )
}

export default InputTextbox