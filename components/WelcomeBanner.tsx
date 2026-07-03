const PHOTO = 'https://static.showit.com/file/H7dtw9km6SqQPBR9UEptmQ/154140/9p5a8604.jpg'
const VIDEO = 'https://player.mediadelivery.net/play/667927/711f2caf-4ce8-40c9-9944-54e18a2ddc88'
const SHOP = 'https://solutionintegrators.us/shop'
const OFFERS = 'https://solutionintegrators.us/service-guide'

export default function WelcomeBanner() {
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
          <h2 className="wb-h">Good to have you here! Jump right into your Goodies.</h2>
          <p className="wb-sub">Everything you need is in one place. Start wherever makes sense for you.</p>
          <div className="wb-btns">
            <a className="wb-btn wb-btn-primary" href={VIDEO} target="_blank" rel="noopener noreferrer">Watch the welcome video</a>
            <a className="wb-btn wb-btn-secondary" href={SHOP} target="_blank" rel="noopener noreferrer">Shop the Goodies Shop</a>
            <a className="wb-btn wb-btn-secondary" href={OFFERS} target="_blank" rel="noopener noreferrer">Learn more about my offers</a>
          </div>
        </div>
        <div className="wb-right" style={{ backgroundImage: `url('${PHOTO}')` }}>
          <div className="wb-fade" />
          <span className="wb-badge">Ashley Tindall · Solution Integrators</span>
        </div>
      </div>
    </>
  )
}
