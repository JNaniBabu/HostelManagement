import { useEffect } from "react";
import {
  MdCheckCircleOutline,
  MdClose,
  MdErrorOutline,
  MdInfoOutline,
  MdWarningAmber,
} from "react-icons/md";

function getMessageTone(message) {
  const value = (message || "").toLowerCase();

  if (
    value.includes("success") ||
    value.includes("saved") ||
    value.includes("added") ||
    value.includes("updated")
  ) {
    return "success";
  }

  if (
    value.includes("required") ||
    value.includes("invalid") ||
    value.includes("match") ||
    value.includes("must")
  ) {
    return "warning";
  }

  if (
    value.includes("error") ||
    value.includes("failed") ||
    value.includes("fail") ||
    value.includes("wrong")
  ) {
    return "error";
  }

  return "info";
}

function Messenger({ Message, Dynamic, DynamicValue }) {
  const isVisible = Boolean(Message && Dynamic);
  const tone = getMessageTone(Message);

  useEffect(() => {
    if (!isVisible) return undefined;

    const hideTimer = setTimeout(() => {
      DynamicValue?.();
    }, 4500);

    return () => clearTimeout(hideTimer);
  }, [isVisible, Message, DynamicValue]);

  function HandleHide() {
    DynamicValue?.();
  }

  const iconByTone = {
    success: <MdCheckCircleOutline size={18} />,
    error: <MdErrorOutline size={18} />,
    warning: <MdWarningAmber size={18} />,
    info: <MdInfoOutline size={18} />,
  };

  return (
    <div
      className={`messenger messenger--${tone} ${
        isVisible ? "messenger--visible" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="messenger__icon">{iconByTone[tone]}</span>
      <p className="messenger__message">{Message}</p>
      <button
        type="button"
        className="messenger__close"
        onClick={HandleHide}
        aria-label="Close notification"
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}

export default Messenger;
