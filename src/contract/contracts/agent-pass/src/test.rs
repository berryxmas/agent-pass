#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{storage::Temporary as _, Address as _, Events as _, Ledger as _};
use soroban_sdk::{Address, Env, Event as _};

fn setup() -> (Env, AgentPassClient<'static>, Address, Address) {
    let env = Env::default();
    let id = env.register(AgentPass, ());
    let client = AgentPassClient::new(&env, &id);
    let app = Address::generate(&env);
    let agent = Address::generate(&env);
    (env, client, app, agent)
}

#[test]
fn no_pass_is_not_valid() {
    let (_env, client, app, agent) = setup();
    assert!(!client.valid(&app, &agent));
}

#[test]
fn pass_is_valid_until_expiry_then_not() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);
    client.issue(&app, &agent, &820);

    assert!(client.valid(&app, &agent));
    env.ledger().set_sequence_number(820);
    assert!(client.valid(&app, &agent));
    env.ledger().set_sequence_number(821);
    assert!(!client.valid(&app, &agent));
}

#[test]
fn pass_is_per_app() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    client.issue(&app, &agent, &(env.ledger().sequence() + 720));
    let other_app = Address::generate(&env);
    assert!(!client.valid(&other_app, &agent));
}

#[test]
fn issue_requires_the_apps_signature() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    client.issue(&app, &agent, &720);
    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, app);
}

#[test]
#[should_panic]
fn issue_without_signature_fails() {
    let (_env, client, app, agent) = setup();
    client.issue(&app, &agent, &720);
}

#[test]
fn expiry_in_the_past_is_rejected() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    env.ledger().set_sequence_number(500);
    assert_eq!(client.try_issue(&app, &agent, &500), Err(Ok(Error::ExpiryInPast)));
}

#[test]
fn issue_emits_an_event() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    client.issue(&app, &agent, &720);
    let expected = Issued { app: app.clone(), agent: agent.clone(), expiry_ledger: 720 };
    assert_eq!(env.events().all(), [expected.to_xdr(&env, &client.address)]);
}

#[test]
fn pass_is_temporary_and_lives_through_expiry() {
    let (env, client, app, agent) = setup();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);
    client.issue(&app, &agent, &820);
    let key = DataKey::Pass(app.clone(), agent.clone());
    env.as_contract(&client.address, || {
        assert!(!env.storage().persistent().has(&key));
        assert!(env.storage().temporary().has(&key));
        assert!(env.storage().temporary().get_ttl(&key) >= 820 - 100);
    });
}
