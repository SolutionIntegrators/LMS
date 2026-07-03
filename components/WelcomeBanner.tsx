'use client'

import { useEffect, useState } from 'react'
import { branding } from '@/lib/branding'

const PHOTO = branding.welcome.photo
const VIDEO = branding.welcome.videoEmbedUrl
const SHOP = branding.links.shop
const OFFERS = branding.links.offers

export default function WelcomeBanner() {
  const [open, setOpen] = useState(false)

  // Close on Escape and lock body scroll while the lightbox is open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .wb-card{display:flex;border-radius:16px;overflow:hidden;background:#3A4F5E;box-shadow:0 6px 24px rgba(44,53,66,0.12);}
        .wb-left{flex:1 1 47%;padding:2.75rem 2.5rem;display:flex;flex-direction:column;justify-content:center;gap:1.15rem;position:relative;z-index:2;}
        .wb-right{flex:1 1 53%;position:relative;min-height:380px;background-size:cover;background-position:top center;background-repeat:no-repeat;}
        .wb-fade{position:absolute;inset:0;background:linear-gradient(to right,#3A4F5E 0%,rgba(58,79,94,0.65) 14%,rgba(58,79,94,0) 32%);}
        .wb-h{font-family:'Marlide Display',Georgia,serif;font-weight:400;font-size:clamp(1.6rem,2.5vw,2.15rem);line-height:1.2;color:#FCF1E8;margin:0;text-wrap:balance;}
        .wb-sub{font-family:'Questrial',var(--font-questrial),sans-serif;font-size:1rem;line-height:1.65;color:rgba(252,241,232,0.72);margin:0;max-width:36ch;}
        .wb-btns{display:flex;flex-direction:column;gap:0.7rem;margin-top:0.35rem;max-width:340px;}
        .wb-btn{display:block;text-align:center;font-family:'DM Sans',var(--font-dm-sans),sans-serif;font-weight:600;font-size:0.8rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.85rem 1.25rem;border-radius:8px;text-decoration:none;transition:opacity .2s,background .2s;}
        .wb-btn-primary{background:#A34F2B;color:#fff;border:2px solid #A34F2B;}
        .wb-btn-primary:hover{opacity:0.92;}
        .wb-btn-secondary{background:transparent;color:#FCF1E8;border:2px solid rgba(252,241,232,0.45);}
        .wb-btn-secondary:hover{background:rgba(252,241,232,0.12);}
        .wb-badge{position:absolute;bottom:14px;right:14px;z-index:2;background:rgba(20,26,32,0.55);color:#FCF1E8;font-family:'DM Sans',var(--font-dm-sans),sans-serif;font-size:0.72rem;letter-spacing:0.02em;padding:0.35rem 0.7rem;border-radius:6px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
        @media (max-width:720px){
          .wb-card{flex-direction:column;}
          .wb-right{order:-1;min-height:300px;flex-basis:auto;background-position:center 30%;}
          .wb-fade{background:linear-gradient(to bottom,rgba(58,79,94,0) 62%,#3A4F5E 100%);}
          .wb-left{padding:1.75rem 1.5rem;}
          .wb-btns{max-width:none;}
        }
      ` }} />
      <div className="wb-card">
        <div className="wb-left">
          <h2 className="wb-h">{branding.welcome.heading}</h2>
          <p className="wb-sub">{branding.welcome.subheading}</p>
          <div className="wb-btns">
            <button type="button" className="wb-btn wb-btn-primary" onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>{branding.welcome.videoButtonLabel}</button>
            <a className="wb-btn wb-btn-secondary" href={SHOP} target="_blank" rel="noopener noreferrer">Shop the Goodies Shop</a>
            <a className="wb-btn wb-btn-secondary" href={OFFERS} target="_blank" rel="noopener noreferrer">Learn more about my offers</a>
          </div>
        </div>
        <div className="wb-right" style={{ backgroundImage: `url('${PHOTO}')` }}>
          <div className="wb-fade" />
          <span className="wb-badge">{branding.welcome.photoBadge}</span>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome video"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(20,26,32,0.78)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 960 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close video"
              style={{
                position: 'absolute', top: -44, right: 0, background: 'transparent', border: 'none',
                color: '#FCF1E8', fontSize: '1.75rem', lineHeight: 1, cursor: 'pointer', padding: '0.25rem 0.5rem',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ✕
            </button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
              <iframe
                src={VIDEO}
                title="Welcome video"
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
