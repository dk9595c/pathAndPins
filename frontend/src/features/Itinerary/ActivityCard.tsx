import React from "react";
import "./ActivityCard.css";

interface ActivityCardProps {
  name: string;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  name,
  onRemove,
  dragHandleProps,
}) => {
  return (
    <div className="activity-card">
      <div 
        className="drag-handle" 
        tabIndex={0} 
        role="button" 
        aria-label={`Reorder ${name}`} 
        {...dragHandleProps}
      >
        ⠿
      </div>
      <span>{name}</span>
      <button 
        className="remove-btn" 
        onClick={onRemove}
        aria-label={`Remove ${name} from itinerary`}
      >
        ✕
      </button>
    </div>
  );
};

export default ActivityCard;