import React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DatePicker.css";

type Props = {
  label: string;
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
};

const DatePicker: React.FC<Props> = ({ label, selectedDate, onChange }) => {
  return (
    <div className="date-picker-wrapper">
      <label>{label}</label>
      <ReactDatePicker
        selected={selectedDate}
        onChange={onChange}
        placeholderText="Select date"
        className="date-picker-input"
        dateFormat="MM/dd/yyyy"
      />
    </div>
  );
};

export default DatePicker;
