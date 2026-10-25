import React from 'react';
import { buildWhatsAppEnquiryUrl } from '../utils/auditEngine';
import { MessageSquare, Phone, Send, Sparkles } from 'lucide-react';

interface TailoringServiceItem {
  no: string;
  title: string;
  category: 'blouse' | 'garment' | 'finishing';
  description: string;
  turnaroundNote: string;
  gradientClass: string;
}

const SERVICES: TailoringServiceItem[] = [
  {
    no: '01',
    title: 'Custom Blouse Stitching',
    category: 'blouse',
    description: 'Stitched around your exact measurements, neckline, sleeve length, back design, and lining preference.',
    turnaroundNote: 'Bridal, silk saree & daily wear blouses',
    gradientClass: 'from-rose-950 via-rose-900 to-amber-900',
  },
  {
    no: '02',
    title: 'Blouse Alterations',
    category: 'blouse',
    description: 'Refining an existing blouse for improved armhole comfort, shoulder stability, margin let-out, or dart shaping.',
    turnaroundNote: 'Bring a well-fitting reference blouse',
    gradientClass: 'from-stone-900 via-rose-950 to-stone-800',
  },
  {
    no: '03',
    title: "Women's Tailoring",
    category: 'garment',
    description: 'Personalized stitching for everyday and festive women’s garments with careful attention to drape and ease.',
    turnaroundNote: 'Custom daily & festive silhouettes',
    gradientClass: 'from-amber-950 via-rose-900 to-stone-900',
  },
  {
    no: '04',
    title: 'Dress Stitching',
    category: 'garment',
    description: 'Custom dresses and Kurtis shaped around your chosen silhouette, fabric weight, and occasion.',
    turnaroundNote: 'Made-to-measure occasion dresses',
    gradientClass: 'from-rose-900 via-stone-900 to-amber-950',
  },
  {
    no: '05',
    title: 'Embroidery & Finishing',
    category: 'finishing',
    description: 'Decorative neckline borders, sleeve motifs, tassels, and hand-finished details to elevate your garment.',
    turnaroundNote: 'Custom neckline & sleeve detailing',
    gradientClass: 'from-amber-900 via-rose-950 to-stone-900',
  },
  {
    no: '06',
    title: 'Custom Fitting Consultation',
    category: 'finishing',
    description: 'Dedicated measurement and trial adjustments focused on how the garment feels when you move.',
    turnaroundNote: 'PRT Street Studio · Dharmavaram',
    gradientClass: 'from-stone-950 via-rose-900 to-amber-900',
  },
];

const ASSISTANT_KNOWLEDGE: Record<string, string> = {
  'Wedding blouse':
    'For a wedding silk blouse at SM Tailoring, please prepare:\n1. Your saree or a clear photo of the border/pallu so we can match lining and piping.\n2. Your preferred front/back neck depth and sleeve length (e.g., elbow-length for heavy borders).\n3. Whether you want padded cups, side zip, or back hooks, plus any embroidery/maggam reference photos.',
  Measurements:
    'For an accurate blouse fit, Sivamma checks: Bust, Waist/Underbust, Shoulder width, Armhole round, Sleeve length & circumference, Front neck depth, Back neck depth, and Total blouse length. Bringing your best-fitting existing blouse makes measurement matching even faster.',
  'Fit problem':
    'Tightness under the arms is usually caused by a high armhole cut, narrow sleeve cap, or insufficient chest ease. Bring the blouse to PRT Street, Dharmavaram—we will inspect the internal seam allowance to let out the armhole or reshape the curve.',
  Alteration:
    'When bringing a blouse or dress for alteration, please bring:\n1. The garment needing alteration.\n2. One existing blouse/garment that fits you comfortably for reference.\n3. The saree or innerwear you plan to wear with it so shoulder and neckline balance can be checked accurately.',
};

export const LiveRemediatedPreview: React.FC = () => {
  const [serviceFilter, setServiceFilter] = React.useState<'all' | 'blouse' | 'garment' | 'finishing'>('all');
  const [name, setName] = React.useState('');
  const [service, setService] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [generatedWaPreview, setGeneratedWaPreview] = React.useState<{ url: string; body: string } | null>(null);

  // Hardened AI Assistant Interactive Preview state
  const [chatHistory, setChatHistory] = React.useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: 'Namaste! I am the SM Tailoring assistant (hardened with origin verification & IP rate-limiting). Ask about blouse measurements, wedding blouse preparation, or alterations.',
    },
  ]);
  const [chatInput, setChatInput] = React.useState('');

  const visibleServices = SERVICES.filter(
    (s) => serviceFilter === 'all' || s.category === serviceFilter
  );

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = buildWhatsAppEnquiryUrl({ name, service, message });
    if (!res.valid) {
      setFormError(res.error || 'Please complete required fields.');
      setGeneratedWaPreview(null);
      return;
    }
    setFormError(null);
    setGeneratedWaPreview({
      url: res.url!,
      body: res.formattedBody!,
    });
  };

  const handleAskQuestion = (questionText: string) => {
    const clean = questionText.trim();
    if (!clean) return;

    const matchedKey = Object.keys(ASSISTANT_KNOWLEDGE).find((k) =>
      clean.toLowerCase().includes(k.toLowerCase())
    );
    const reply = matchedKey
      ? ASSISTANT_KNOWLEDGE[matchedKey]
      : `Thank you for asking about "${clean}". At SM Tailoring (PRT Street, Dharmavaram), Sivamma provides custom blouse stitching, alterations, embroidery, and dress stitching. For exact pricing and delivery dates, please message +91 91777 87592 on WhatsApp.`;

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', text: clean },
      { role: 'assistant', text: reply },
    ]);
    setChatInput('');
  };

  return (
    <div className="space-y-8">
      {/* Banner explaining what was fixed in this live preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <span>Remediated Live Experience</span>
            <span aria-hidden="true"> · </span>
            <span>Zero Render-Blocking Loader</span>
            <span aria-hidden="true"> · </span>
            <span>Accessible Tablet/Mobile Nav</span>
            <span aria-hidden="true"> · </span>
            <span>Semantic Lazy-Loaded Cards</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            SM Tailoring — Hardened &amp; Optimized Production Preview
          </h2>
        </div>
        <div className="text-xs font-mono text-slate-600">
          Dharmavaram, AP 515671 · +91 91777 87592
        </div>
      </div>

      {/* Remediated SM Tailoring Site Frame */}
      <div className="rounded-2xl overflow-hidden border border-stone-300 bg-[#fff8f2] text-[#241c1c] shadow-sm">
        {/* Remediated Hero Section (No blocking page-loader, instant LCP) */}
        <div className="bg-gradient-to-br from-[#2b0612] via-[#4b0d20] to-[#68122d] text-white px-6 py-12 md:px-12 md:py-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="text-xs tracking-widest text-[#e5b96f] font-semibold">
                PRT STREET · DHARMAVARAM · ANDHRA PRADESH 515671
              </div>
              <h3 className="font-serif-editorial text-4xl sm:text-5xl font-medium tracking-tight leading-none">
                SM <em className="text-[#e5b96f] italic">Tailoring</em>
              </h3>
              <p className="text-sm sm:text-base text-rose-100/90 max-w-xl leading-relaxed">
                Custom blouse stitching, bridal embroidery, precise alterations, and women’s tailoring by Sivamma — crafted around your measurements and finished with care.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#remediated-enquiry"
                  className="px-5 py-2.5 text-xs font-semibold bg-[#a70d55] hover:bg-[#c21264] text-white rounded-lg transition-colors"
                >
                  Start an Enquiry
                </a>
                <a
                  href="#remediated-services"
                  className="px-5 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-lg transition-colors"
                >
                  Explore Services
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/5 border border-white/15 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#e5b96f]">
                <span>ATELIER HIGHLIGHTS</span>
                <span className="font-mono">EST. DHARMAVARAM</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="font-mono text-[#e5b96f]">01 · Measure</div>
                  <div className="mt-1 font-medium text-white">Personal Bust &amp; Armhole Balance</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="font-mono text-[#e5b96f]">02 · Shape</div>
                  <div className="mt-1 font-medium text-white">Custom Necklines &amp; Dart Placement</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="font-mono text-[#e5b96f]">03 · Stitch</div>
                  <div className="mt-1 font-medium text-white">Clean Lining &amp; Seam Allowance</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="font-mono text-[#e5b96f]">04 · Finish</div>
                  <div className="mt-1 font-medium text-white">Embroidery, Piping &amp; Fit Check</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remediated Services Section with Interactive Category Filter & Semantic Cards */}
        <div id="remediated-services" className="px-6 py-10 md:px-12 max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wider text-[#b9965a]">
                01 · TAILORING SERVICES
              </div>
              <h4 className="font-serif-editorial text-2xl sm:text-3xl text-[#4b0d20] mt-1">
                Tailoring, <em className="text-[#b9965a] italic">your way.</em>
              </h4>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg" role="group" aria-label="Filter tailoring services">
              {([
                { id: 'all', label: 'All Services (6)' },
                { id: 'blouse', label: 'Blouses' },
                { id: 'garment', label: 'Dresses & Garments' },
                { id: 'finishing', label: 'Embroidery & Fit' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setServiceFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    serviceFilter === tab.id
                      ? 'bg-[#4b0d20] text-white font-semibold'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleServices.map((item) => (
              <article
                key={item.no}
                className="bg-white border border-[#ead8d0] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Resilient visual header replacing duplicate CSS :before Pexels URLs */}
                  <div
                    className={`h-32 bg-gradient-to-br ${item.gradientClass} p-4 flex flex-col justify-between text-white`}
                    role="img"
                    aria-label={`${item.title} — ${item.turnaroundNote}`}
                  >
                    <span className="font-mono text-xs text-[#e5b96f]">{item.no}</span>
                    <span className="text-xs text-rose-100/90 font-medium">{item.turnaroundNote}</span>
                  </div>
                  <div className="p-5">
                    <h5 className="font-serif-editorial text-xl text-[#4b0d20] font-semibold">
                      {item.title}
                    </h5>
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setService(item.title);
                      document.getElementById('remediated-enquiry')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#4b0d20] hover:underline cursor-pointer"
                  >
                    Select for Enquiry →
                  </button>
                  <span className="text-[11px] text-stone-400 font-mono">SM / 2026</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Remediated Enquiry Builder + Hardened AI Assistant Preview */}
        <div
          id="remediated-enquiry"
          className="px-6 py-10 md:px-12 bg-[#f6e9e3] border-t border-[#ead8d0]"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Validated WhatsApp Enquiry Form (No popup blocker failure) */}
            <div className="lg:col-span-6 bg-white border border-[#ead8d0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#b9965a] font-mono">
                <span>WHATSAPP ENQUIRY BUILDER</span>
                <span>+91 91777 87592</span>
              </div>
              <h4 className="font-serif-editorial text-2xl text-[#4b0d20]">
                Start with a few details.
              </h4>
              <form onSubmit={handleEnquirySubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="preview-customer-name" className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Name
                  </label>
                  <input
                    id="preview-customer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="e.g. Lakshmi Devi"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4b0d20]"
                  />
                </div>

                <div>
                  <label htmlFor="preview-service" className="block text-xs font-semibold text-stone-700 mb-1">
                    What do you need?
                  </label>
                  <select
                    id="preview-service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4b0d20]"
                  >
                    <option value="">Choose a service</option>
                    <option value="Custom blouse stitching">Custom blouse stitching</option>
                    <option value="Blouse alterations">Blouse alterations</option>
                    <option value="Women's tailoring">Women's tailoring</option>
                    <option value="Dress stitching">Dress stitching</option>
                    <option value="Embroidery">Embroidery</option>
                    <option value="Custom fitting">Custom fitting</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="preview-message" className="block text-xs font-semibold text-stone-700 mb-1">
                    Tell us a little more (optional)
                  </label>
                  <textarea
                    id="preview-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    placeholder="Neckline design, wedding occasion, or alteration details..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4b0d20]"
                  />
                </div>

                {formError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#4b0d20] hover:bg-[#68122d] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate WhatsApp Enquiry</span>
                </button>
              </form>

              {generatedWaPreview && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2" data-testid="wa-enquiry-preview">
                  <div className="text-xs font-semibold text-emerald-900">
                    Enquiry Ready for Sivamma (+91 91777 87592)
                  </div>
                  <pre className="text-xs font-mono text-emerald-950 whitespace-pre-wrap bg-white p-2.5 rounded border border-emerald-200">
                    {generatedWaPreview.body}
                  </pre>
                  <a
                    href={generatedWaPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Open Directly in WhatsApp ↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* Right: Hardened AI Tailoring Assistant Simulator */}
            <div className="lg:col-span-6 bg-white border border-[#ead8d0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4b0d20]" />
                  <span className="text-xs font-bold text-[#4b0d20]">
                    SM Tailoring Smart Guide
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-500">
                  Rate-Limited · Multi-Provider Gateway
                </span>
              </div>

              <div className="h-56 overflow-y-auto space-y-2.5 p-3 bg-[#f9f3ec] border border-[#e7d9c6] rounded-lg">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-xs whitespace-pre-wrap leading-relaxed max-w-[90%] ${
                      msg.role === 'user'
                        ? 'ml-auto bg-[#4b0d20] text-white'
                        : 'bg-white border border-[#e7d9c6] text-stone-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['Wedding blouse', 'Measurements', 'Fit problem', 'Alteration'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAskQuestion(q)}
                    className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion(chatInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  aria-label="Ask tailoring assistant a question"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about blouse measurements or alterations..."
                  className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4b0d20]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4b0d20] hover:bg-[#68122d] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
