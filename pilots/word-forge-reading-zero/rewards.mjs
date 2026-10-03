export const parts=Object.freeze([{id:'fan',price:4},{id:'paddle',price:4}]);
const check=(ok)=>{if(!ok)throw Error('Invalid rewards');};
export class Rewards {
  constructor(saved){this.state=saved?structuredClone(saved):{coins:0,settled:{},owned:[],part:null};
    const s=this.state;check(Object.keys(s).sort().join(',')==='coins,owned,part,settled');check(Number.isSafeInteger(s.coins)&&s.coins>=0&&Array.isArray(s.owned)&&new Set(s.owned).size===s.owned.length&&s.owned.every(id=>parts.some(p=>p.id===id))&&(s.part===null||s.owned.includes(s.part)));
    check(s.settled&&typeof s.settled==='object'&&!Array.isArray(s.settled));check(Object.entries(s.settled).every(([id,n])=>/^\d+$/.test(id)&&[1,2].includes(n)));
    check(s.coins+4*s.owned.length===Object.values(s.settled).reduce((sum,n)=>sum+n,0));
  }
  settle(event){if(!event.correct||Object.hasOwn(this.state.settled,event.id))return 0;
    const amount=event.skill&&event.first&&event.independent?2:1;this.state.settled[event.id]=amount;this.state.coins+=amount;return amount;}
  buy(id){const p=parts.find(p=>p.id===id);if(!p)return false;
    if(!this.state.owned.includes(id)){if(this.state.coins<p.price)return false;this.state.coins-=p.price;this.state.owned.push(id);}
    this.state.part=id;return true;
  }
  snapshot(){return structuredClone(this.state);}
}
