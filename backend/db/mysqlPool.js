import mysql from 'mysql2/promise'
import { useMysql } from './sqlDialect.js'

let pool

/**
 * Comme le boilerplate Hostinger (Prisma) : `DATABASE_URL` mysql://user:pass@host:port/db
 * Alternative : MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE [, MYSQL_PORT]
 */
export function createMysqlPool() {
  if (pool) return pool

  const urlStr = process.env.DATABASE_URL?.trim()
  if (urlStr) {
    const u = new URL(urlStr)
    if (u.protocol !== 'mysql:' && u.protocol !== 'mariadb:') {
      throw new Error('DATABASE_URL doit commencer par mysql:// ou mariadb://')
    }
    pool = mysql.createPool({
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: u.pathname.replace(/^\//, '') || undefined,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      multipleStatements: true,
    })
    return pool
  }

  const host = process.env.MYSQL_HOST
  const user = process.env.MYSQL_USER
  const password = process.env.MYSQL_PASSWORD
  const database = process.env.MYSQL_DATABASE
  if (!host || !user || password === undefined || !database) {
    throw new Error('Variables MySQL incomplètes (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)')
  }
  pool = mysql.createPool({
    host,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    multipleStatements: true,
  })
  return pool
}

export function getMysqlPool() {
  if (!useMysql()) throw new Error('MySQL non activé')
  return createMysqlPool()
}
