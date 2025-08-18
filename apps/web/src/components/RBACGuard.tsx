'use client';
export default function RBACGuard({role, allow, children}:{role?:string; allow:string[]; children:any}){
  if(!role || !allow.includes(role)) return <div className="text-rose-400">Forbidden</div>;
  return children;
}
