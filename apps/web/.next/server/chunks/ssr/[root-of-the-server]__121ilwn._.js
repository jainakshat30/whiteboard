module.exports=[23862,a=>a.a(async(b,c)=>{try{let b=await a.y("pg-587764f78a6c7a9c");a.n(b),c()}catch(a){c(a)}},!0),66746,a=>a.a(async(b,c)=>{try{var d=a.i(23862),e=b([d]);[d]=e.then?(await e)():e;let k=globalThis.pool??new d.Pool({connectionString:process.env.DATABASE_URL}),l=!1;async function f(){l||(await k.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Board',
      snapshot BYTEA,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `),l=!0)}async function g(){return await f(),(await k.query(`
    SELECT id, title, created_at, updated_at
    FROM boards
    ORDER BY updated_at DESC
  `)).rows}async function h(a,b="Untitled Board"){return await f(),(await k.query(`
    INSERT INTO boards (id, title, snapshot, created_at, updated_at)
    VALUES ($1, $2, NULL, NOW(), NOW())
    RETURNING id, title, created_at, updated_at
    `,[a,b])).rows[0]}async function i(a){await f(),await k.query("DELETE FROM boards WHERE id = $1",[a])}async function j(a,b){await f(),await k.query("UPDATE boards SET title = $1, updated_at = NOW() WHERE id = $2",[b,a])}a.s(["createBoard",0,h,"deleteBoard",0,i,"getBoards",0,g,"updateBoardTitle",0,j]),c()}catch(a){c(a)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__121ilwn._.js.map