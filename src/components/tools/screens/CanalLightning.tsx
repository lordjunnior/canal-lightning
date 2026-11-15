import { useState } from 'react';
import { Zap, ArrowRight, ArrowLeft, Route } from 'lucide-react';
import { SuiteHero, Stat, Faq } from './SovereignKit';
import { channelBalance, canRoute, routeFeeSat, forwardingFeeMsat, type Hop } from '@/components/tools/lib/sovereign-math';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

export default function CanalLightning() {
  const [capacity, setCapacity] = useState(2_000_000);
  const [local, setLocal] = useState(1_400_000);
  const [amount, setAmount] = useState(50_000);
  const [log, setLog] = useState<{ id: number; dir: 'out' | 'in'; ok: boolean; amt: number }[]>([]);
  const [hops, setHops] = useState<Hop[]>([{ name: 'Nó A', baseMsat: 1000, ppm: 100 }, { name: 'Nó B', baseMsat: 0, ppm: 250 }]);

  const bal = channelBalance(capacity, local);
  const reserve = Math.ceil(capacity / 100);
  const send = (dir: 'out' | 'in') => {
    const ok = canRoute(amount, dir === 'out' ? bal.outbound : bal.inbound, capacity);
    if (ok) setLocal(l => (dir === 'out' ? l - amount : l + amount));
    setLog(lg => [{ id: Date.now(), dir, ok, amt: amount }, ...lg].slice(0, 6));
  };
  const fee = routeFeeSat(amount, hops);
  const updateHop = (i: number, k: 'baseMsat' | 'ppm', v: number) => setHops(h => h.map((x, j) => (j === i ? { ...x, [k]: Math.max(0, v) } : x)));
  const last = log[0];

  return <div className="ss-root">
    <SuiteHero kicker="Pagamentos instantâneos · Lightning Network" title="Canal" accent="Relâmpago" repo="https://github.com/lightningnetwork/lnd" repoLabel="LND (LIGHTNING LABS)"
      lead="Um canal Lightning é um cano com moedas dos dois lados. O que está do seu lado você pode enviar. O que está do outro lado é o quanto você pode receber. Mova o saldo, dispare pagamentos e calcule as taxas de uma rota." />
    <div className="ss-wrap">
      <section className="ss-plate">
        <span className="ss-tag">01 · CANAL</span>
        <h2><Zap size={22} style={{ display: 'inline', marginRight: 10 }} />Seu canal</h2>
        <p className="ss-sub">Dourado: saldo para enviar. Brasa: espaço para receber. Cada lado guarda 1% de reserva que não pode ser gasto.</p>
        <div className="ss-channel">
          <div className="ss-node">VOCÊ</div>
          <div className="ss-pipe" aria-label={`Envio ${fmt(bal.outbound)} sats, recebimento ${fmt(bal.inbound)} sats`}>
            <span className="out" style={{ width: `${bal.localPct}%` }} />
            <span className="in" style={{ width: `${100 - bal.localPct}%` }} />
            {last && last.ok && <span key={last.id} className={`pkt${last.dir === 'in' ? ' rev' : ''}`} />}
          </div>
          <div className="ss-node">PARCEIRO</div>
        </div>
        <div className="ss-stats" style={{ marginTop: 20 }}>
          <Stat value={fmt(bal.outbound)} label="Sats para enviar" tone="hot" />
          <Stat value={fmt(bal.inbound)} label="Sats para receber" tone="ember" />
          <Stat value={fmt(reserve)} label="Reserva por lado" />
          <Stat value={`${bal.localPct.toFixed(0)}%`} label="Equilíbrio local" />
        </div>
        <div className="ss-grid even" style={{ marginTop: 6 }}>
          <div><label className="ss-label" htmlFor="ln-cap">Capacidade: {fmt(capacity)} sats</label>
            <input id="ln-cap" className="ss-range" type="range" min={100_000} max={10_000_000} step={100_000} value={capacity} onChange={e => { const c = Number(e.target.value); setCapacity(c); setLocal(l => Math.min(l, c)); }} /></div>
          <div><label className="ss-label" htmlFor="ln-loc">Seu lado: {fmt(bal.outbound)} sats</label>
            <input id="ln-loc" className="ss-range" type="range" min={0} max={capacity} step={10_000} value={bal.outbound} onChange={e => setLocal(Number(e.target.value))} /></div>
        </div>
      </section>

      <div className="ss-grid even">
        <section className="ss-plate">
          <span className="ss-tag">02 · PAGAMENTO</span>
          <h2>Dispare um pagamento</h2>
          <label className="ss-label" htmlFor="ln-amt">Valor (sats)</label>
          <input id="ln-amt" className="ss-input" type="number" min={1} value={amount} onChange={e => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          <div className="ss-row">
            <button type="button" className="ss-btn" onClick={() => send('out')}><ArrowRight size={14} />Enviar</button>
            <button type="button" className="ss-btn ghost" onClick={() => send('in')}><ArrowLeft size={14} />Receber</button>
          </div>
          <ul style={{ marginTop: 18, display: 'grid', gap: 6, fontSize: 12 }} aria-live="polite">
            {log.map(l => <li key={l.id} className={l.ok ? 'ss-ok' : 'ss-bad'}>{l.dir === 'out' ? '→ ENVIO' : '← RECEBIMENTO'} {fmt(l.amt)} sats · {l.ok ? 'liquidado' : 'falhou: sem saldo nesse lado'}</li>)}
            {!log.length && <li className="ss-sub">Nenhum pagamento ainda.</li>}
          </ul>
        </section>

        <section className="ss-plate">
          <span className="ss-tag">03 · ROTA</span>
          <h2><Route size={22} style={{ display: 'inline', marginRight: 10 }} />Taxa da rota</h2>
          <p className="ss-sub">Cada nó intermediário cobra uma taxa fixa (em milésimos de sat) mais uma parte por milhão do valor que repassa.</p>
          <div className="ss-route">
            <span className="ss-node" style={{ width: 52, height: 52 }}>VOCÊ</span>
            {hops.map((h, i) => <span key={i} style={{ display: 'contents' }}><span className="ss-arrow">→</span>
              <div className="ss-hop"><b>{h.name}</b>
                <label className="ss-label" style={{ margin: '4px 0' }} htmlFor={`hb${i}`}>base msat</label>
                <input id={`hb${i}`} className="ss-input" style={{ padding: 6 }} type="number" min={0} value={h.baseMsat} onChange={e => updateHop(i, 'baseMsat', Number(e.target.value))} />
                <label className="ss-label" style={{ margin: '4px 0' }} htmlFor={`hp${i}`}>ppm</label>
                <input id={`hp${i}`} className="ss-input" style={{ padding: 6 }} type="number" min={0} value={h.ppm} onChange={e => updateHop(i, 'ppm', Number(e.target.value))} />
                <small>{(forwardingFeeMsat(amount, h.baseMsat, h.ppm) / 1000).toLocaleString('pt-BR')} sats</small></div></span>)}
            <span className="ss-arrow">→</span><span className="ss-node" style={{ width: 52, height: 52 }}>DESTINO</span>
          </div>
          <div className="ss-row">
            <button type="button" className="ss-btn ghost" disabled={hops.length >= 4} onClick={() => setHops(h => [...h, { name: `Nó ${String.fromCharCode(65 + h.length)}`, baseMsat: 1000, ppm: 50 }])}>+ Nó</button>
            <button type="button" className="ss-btn ghost" disabled={hops.length <= 1} onClick={() => setHops(h => h.slice(0, -1))}>− Nó</button>
          </div>
          <div className="ss-stats" style={{ marginTop: 18 }}>
            <Stat value={fee.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} label="Taxa total (sats)" tone="hot" />
            <Stat value={`${((fee / amount) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`} label="Custo sobre o valor" />
          </div>
        </section>
      </div>

      <div className="ss-warn">Simulação educativa: os números seguem as regras do LND, mas nenhum pagamento real acontece. Para operar um nó de verdade, comece com valores pequenos e mantenha o backup estático dos canais (SCB) atualizado.</div>

      <Faq items={[
        { q: 'Por que não consigo receber mesmo tendo saldo?', a: 'Receber depende do lado do parceiro. Se todo o saldo do canal estiver do seu lado, não há espaço para entrar. É a chamada liquidez de entrada.' },
        { q: 'O que é ppm?', a: 'Partes por milhão. 100 ppm significa 0,01% do valor repassado, somado à taxa base fixa do nó.' },
        { q: 'Para que serve a reserva de 1%?', a: 'É uma garantia contra fraude: se um lado tentar publicar um estado antigo do canal, o outro pode tomar o saldo como punição.' },
        { q: 'Preciso rodar um nó para usar Lightning?', a: 'Não. Carteiras como Phoenix e Breez gerenciam canais por você. Rodar o próprio LND dá mais privacidade e controle.' },
      ]} />
    </div>
  </div>;
}
