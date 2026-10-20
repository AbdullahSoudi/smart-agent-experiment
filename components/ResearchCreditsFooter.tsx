import React from "react";

export function ResearchCreditsFooter() {
  return (
    <footer className="research-credits-footer" aria-label="بيانات الباحث والإشراف">
      <div className="research-credits-inner">
        <span className="research-credit-item researcher-name">
          الباحث: بسام امام سعيد مراد
        </span>
        <span className="research-credits-separator" aria-hidden="true">
          ·
        </span>
        <span className="research-credit-item supervisor-name">
          إشراف: أ.د / ايمان زكي موسى الشريف
        </span>
      </div>
    </footer>
  );
}
