import wave, sys, array
def tighten(src, dst, thr=0.012, keep_ms=170, trigger_ms=220):
    w=wave.open(src); sr=w.getframerate(); a=array.array('h', w.readframes(w.getnframes())); w.close()
    win=int(sr*0.01); lvl=[max((abs(x) for x in a[i:i+win]), default=0)/32768 for i in range(0,len(a),win)]
    out=array.array('h'); i=0; n=len(lvl)
    s=next((k for k,l in enumerate(lvl) if l>thr),0); e=n-next((k for k,l in enumerate(reversed(lvl)) if l>thr),0)
    out.extend(a[:s*win])  # début (silence d'attaque conservé)
    k=s
    while k<e:
        if lvl[k]>thr:
            out.extend(a[k*win:(k+1)*win]); k+=1
        else:
            j=k
            while j<e and lvl[j]<=thr: j+=1
            dur=(j-k)*10
            if dur>=trigger_ms:
                keep=int(sr*keep_ms/1000); seg=a[k*win:j*win]
                half=keep//2
                out.extend(seg[:half]); out.extend(seg[-(keep-half):])  # garde le souffle de chaque côté
            else: out.extend(a[k*win:j*win])
            k=j
    out.extend(a[e*win:])
    o=wave.open(dst,'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes(out.tobytes()); o.close()
if __name__ == "__main__": tighten(sys.argv[1], sys.argv[2])
