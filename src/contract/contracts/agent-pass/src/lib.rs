#![no_std]
//! `agent_pass`: one record per (app, agent) pair, holding the ledger until
//! which the agent may use the app. Only the app's key can write its passes;
//! anyone can read them. A pass lives in temporary storage: it expires by time,
//! so the ledger drops it after its TTL and the app pays no long-term rent.

use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, Address, Env};

#[contract]
pub struct AgentPass;

#[contracttype]
pub enum DataKey {
    Pass(Address, Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    ExpiryInPast = 1,
}

/// Emitted on every `issue`, so passes sold can be counted from events.
#[contractevent]
pub struct Issued {
    #[topic]
    pub app: Address,
    #[topic]
    pub agent: Address,
    pub expiry_ledger: u32,
}

#[contractimpl]
impl AgentPass {
    /// Record a pass for `agent` at `app`, valid through `expiry_ledger`.
    /// Must be signed by `app`.
    pub fn issue(env: Env, app: Address, agent: Address, expiry_ledger: u32) -> Result<(), Error> {
        app.require_auth();
        let now = env.ledger().sequence();
        if expiry_ledger <= now {
            return Err(Error::ExpiryInPast);
        }
        let key = DataKey::Pass(app.clone(), agent.clone());
        let storage = env.storage().temporary();
        storage.set(&key, &expiry_ledger);
        // Keep the entry at least until the pass expires.
        let live_for = expiry_ledger - now;
        storage.extend_ttl(&key, live_for, live_for);
        Issued { app, agent, expiry_ledger }.publish(&env);
        Ok(())
    }

    /// True while `agent` holds an unexpired pass at `app`.
    pub fn valid(env: Env, app: Address, agent: Address) -> bool {
        env.storage()
            .temporary()
            .get::<_, u32>(&DataKey::Pass(app, agent))
            .is_some_and(|expiry| env.ledger().sequence() <= expiry)
    }
}

mod test;
