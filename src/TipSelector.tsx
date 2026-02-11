import React, { useState, useEffect } from "react";

interface TipSelectorProps {
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
}

const TipSelector: React.FC<TipSelectorProps> = ({
  onAmountChange,
  disabled,
}) => {
  const [selected, setSelected] = useState<string>("5");
  const [customAmount, setCustomAmount] = useState<string>("");

  const options = ["5", "10", "15", "custom"];

  useEffect(() => {
    if (selected === "custom") {
      onAmountChange(customAmount);
    } else {
      onAmountChange(selected);
    }
  }, [selected, customAmount, onAmountChange]);

  const handleSelect = (opt: string) => {
    if (disabled) return;
    setSelected(opt);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setCustomAmount("");
      return;
    }
    // Allow numbers and one decimal point, max 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(val)) {
      const num = parseFloat(val);
      if (num <= 1000) {
        setCustomAmount(val);
      }
    }
  };

  return (
    <div className="tip-selector-wrapper">
      <div className={`tip-selector ${disabled ? "is-disabled" : ""}`}>
        {options.map((opt) => (
          <div key={opt} className="tip-selector__option">
            <button
              type="button"
              className={`tip-selector__button ${selected === opt ? "is-selected" : ""} ${opt === "custom" ? "is-custom" : ""}`}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
            >
              {opt === "custom" ? (
                selected === "custom" ? (
                  <input
                    type="text"
                    className="tip-selector__input"
                    value={customAmount}
                    onChange={handleCustomChange}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Custom"
                    autoFocus
                    disabled={disabled}
                  />
                ) : (
                  "Custom"
                )
              ) : (
                opt
              )}
            </button>
          </div>
        ))}
      </div>
      <span className="tip-selector-currency">USDC</span>
    </div>
  );
};

export default TipSelector;
