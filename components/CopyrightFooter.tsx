import React from "react";

export function CopyrightFooter() {
  return (
    <footer className="copyright-footer" aria-label="حقوق النشر والتواصل">
      <div className="copyright-footer-inner">
        <span className="copyright-text">
          © 2026 Abdullah Mustafa — جميع الحقوق محفوظة
        </span>
        <span className="copyright-separator" aria-hidden="true">
          ·
        </span>
        <a
          href="https://wa.me/201032398617"
          target="_blank"
          rel="noopener noreferrer"
          className="copyright-whatsapp-link"
          aria-label="تواصل عبر واتساب"
        >
          واتساب
        </a>
      </div>
    </footer>
  );
}
