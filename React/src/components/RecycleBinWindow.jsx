// src/components/RecycleBinWindow.jsx
import { useRef } from "react";
import Draggable from "react-draggable";
import RecycleBin from "./RecycleBin";

export default function RecycleBinWindow({ isOpen, onClose }) {
  const nodeRef = useRef(null);

  if (!isOpen) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".window-header">
      <div ref={nodeRef} className="mac-window recycle-window">
        <div className="window-header">
          <div className="traffic-lights">
            <button className="traffic-btn close" onClick={onClose} />
            <button className="traffic-btn minimize" disabled />
            <button className="traffic-btn maximize" disabled />
          </div>
          <div className="window-title">Recycle Bin</div>
        </div>

        <div className="window-body">
          {/* conținutul propriu-zis al recycle bin-ului */}
          <RecycleBin onBack={onClose} />
        </div>
      </div>
    </Draggable>
  );
}
