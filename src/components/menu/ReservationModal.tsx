import React, { useState } from 'react';
import { X, Calendar, Clock, Users, CheckCircle, Sparkles } from 'lucide-react';
import { RestaurantInfo } from '../../types/menu';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: RestaurantInfo;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  restaurant,
}) => {
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('2026-10-20');
  const [time, setTime] = useState('19:30');
  const [seating, setSeating] = useState('dining-room');
  const [specialRequests, setSpecialRequests] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmed(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#111113] border border-[#27272A] rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-5 border-b border-[#222226] flex items-center justify-between bg-[#141417]">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold">
              Tableside Concierge
            </span>
            <h3 className="font-serif text-xl text-[#F5F5F0] font-medium">
              Reserve Tasting Experience
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] hover:bg-[#1E1E22] rounded-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmed ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
              <CheckCircle className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h4 className="font-serif text-2xl text-[#F5F5F0]">
              Reservation Confirmed
            </h4>
            <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
              We look forward to welcoming you, <strong className="text-[#F5F5F0]">{guestName || 'Guest'}</strong>, on{' '}
              <strong className="text-[#F5F5F0]">{date}</strong> at <strong className="text-[#F5F5F0]">{time}</strong> for a party of{' '}
              <strong className="text-[#F5F5F0]">{partySize}</strong>.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setConfirmed(false);
                  onClose();
                }}
                className="px-6 py-2.5 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs cursor-pointer"
              >
                Return to Menu
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Guests
                </label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Time
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
                  >
                    {['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                Seating Atmosphere
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dining-room', label: 'Grand Salon' },
                  { id: 'chef-counter', label: "Chef's Counter" },
                  { id: 'terrace', label: 'Veranda Terrace' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSeating(s.id)}
                    className={`p-2 text-center text-xs rounded-xs border transition-colors cursor-pointer ${
                      seating === s.id
                        ? 'border-[#C5A880] bg-[#C5A880]/10 text-[#F5F5F0]'
                        : 'border-[#27272A] bg-[#161619] text-[#A1A1AA] hover:text-[#F5F5F0]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Aurélien Laurent"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@etoile.fr"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                Special Dietary Notes or Occasion
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Severe nut allergy, wedding anniversary celebration, sommelier pairing preference..."
                className="w-full p-2.5 text-xs bg-[#161619] border border-[#27272A] rounded-xs text-[#F5F5F0] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Confirm Reservation Request</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
