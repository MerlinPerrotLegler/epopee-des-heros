/**
 * Adaptateur commun : prepare().get/all/run retournent des Promises
 * pour permettre le même code async avec SQLite ou MySQL.
 */
export function createMysqlAdapter(pool) {
  return {
    prepare(sql) {
      return {
        get: async (...params) => {
          const [rows] = await pool.execute(sql, params)
          return rows[0]
        },
        all: async (...params) => {
          const [rows] = await pool.execute(sql, params)
          return rows
        },
        run: async (...params) => {
          const [result] = await pool.execute(sql, params)
          return {
            changes: result.affectedRows,
            lastInsertRowid: result.insertId,
          }
        },
      }
    },
    async exec(sql) {
      await pool.query(sql)
    },
    pragma() {
      /* no-op MySQL */
    },
    /**
     * MySQL : callback async avec tx ; SQLite : voir createSqliteAdapter
     */
    transaction(fn) {
      return async () => {
        const conn = await pool.getConnection()
        try {
          await conn.beginTransaction()
          const tx = {
            prepare: (s) => ({
              get: async (...p) => {
                const [rows] = await conn.execute(s, p)
                return rows[0]
              },
              all: async (...p) => {
                const [rows] = await conn.execute(s, p)
                return rows
              },
              run: async (...p) => {
                const [result] = await conn.execute(s, p)
                return {
                  changes: result.affectedRows,
                  lastInsertRowid: result.insertId,
                }
              },
            }),
          }
          await fn(tx)
          await conn.commit()
        } catch (e) {
          await conn.rollback()
          throw e
        } finally {
          conn.release()
        }
      }
    },
  }
}

export function createSqliteAdapter(db) {
  return {
    prepare(sql) {
      const stmt = db.prepare(sql)
      return {
        get: (...params) => Promise.resolve(stmt.get(...params)),
        all: (...params) => Promise.resolve(stmt.all(...params)),
        run: (...params) => Promise.resolve(stmt.run(...params)),
      }
    },
    exec(sql) {
      return Promise.resolve(db.exec(sql))
    },
    pragma: (...args) => db.pragma(...args),
    transaction(fn) {
      return () =>
        new Promise((resolve, reject) => {
          try {
            db.transaction(() => {
              const tx = {
                prepare: (s) => {
                  const st = db.prepare(s)
                  return {
                    get: (...p) => st.get(...p),
                    all: (...p) => st.all(...p),
                    run: (...p) => st.run(...p),
                  }
                },
              }
              fn(tx)
            })()
            resolve()
          } catch (e) {
            reject(e)
          }
        })
    },
  }
}
