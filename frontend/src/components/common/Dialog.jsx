import "./Dialog.css";

export default function Dialog({ icon, title, body, actions }) {
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        {icon && <div className="dialog__icon">{icon}</div>}
        <h2 className="dialog__title">{title}</h2>
        <p className="dialog__body">{body}</p>
        <div className="dialog__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              className={`dialog__btn dialog__btn--${action.variant}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
