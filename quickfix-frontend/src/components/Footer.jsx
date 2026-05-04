import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-20">
      <div className="page-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-white mb-3">
              <span className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-white text-xs font-black">Q</span>
              Quick<span className="text-brand-500">Fix</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connecting homeowners with trusted, verified local pros. Fast, transparent, and reliable.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Services</h4>
            <ul className="space-y-2 text-sm">
              {['Plumbing', 'Electrical', 'HVAC', 'Painting', 'Cleaning'].map(s => (
                <li key={s}><Link to={`/services/${s.toLowerCase()}`} className="hover:text-white transition-colors">{s}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Become a Pro</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Trust & Safety</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:support@quickfix.ca" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><Link to="/" className="hover:text-white transition-colors">Help Centre</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">© 2024 QuickFix. All rights reserved.</p>
          <p className="text-xs text-slate-600">Serving Toronto, Mississauga, Brampton & the GTA</p>
        </div>
      </div>
    </footer>
  );
}
