// Tall corner with small sideways drift. This path must not match Z.
const pixels=[[145,123],[153,124],[163,124],[171,123],[170,139],[168,157],[167,174],
  [165,193],[163,211],[161,230],[161,244],[162,251],[167,254],[168,263],[168,270]];
export const narrowCorner=pixels.map(([x,y])=>({x:.3+(x-145)/26*.0922,y:.15+(y-123)/147*.5061}));
