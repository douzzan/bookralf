// Small credit line for the page footers. Opens an email draft to OuzzyCompany.
const EMAIL = "ouzzycompany@gmail.com";
const SUBJECT = "I love the Ralf's Chops website — I want one too!";
const BODY = "Hey OuzzyCompany,\n\nI love the Ralf's Chops website and want one too!\n\nHere's a bit about what I do:\n";

const href = `mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

export default function PoweredBy() {
  return (
    <p className="font-inter text-[11px] text-paper/30">
      Powered by{" "}
      <a href={href} className="text-gold-500/70 hover:text-gold-400 underline underline-offset-2 transition-colors">
        OuzzyCompany
      </a>
    </p>
  );
}
