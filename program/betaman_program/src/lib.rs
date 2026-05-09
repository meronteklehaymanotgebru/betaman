use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM");

#[program]
pub mod betaman_program {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        property_id: String,
        timeout_hours: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.tenant = ctx.accounts.tenant.key();
        escrow.landlord = ctx.accounts.landlord.key();
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.amount = 0;
        escrow.timeout_timestamp = Clock::get()?.unix_timestamp + (timeout_hours as i64 * 3600);
        escrow.state = EscrowState::Pending;
        escrow.property_id = property_id;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.amount = amount;
        Ok(())
    }

    pub fn confirm_viewing(ctx: Context<ConfirmViewing>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Pending, EscrowError::InvalidState);
        escrow.state = EscrowState::Released;
        Ok(())
    }

    pub fn refund_if_timeout(ctx: Context<RefundIfTimeout>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > escrow.timeout_timestamp,
            EscrowError::TimeoutNotReached
        );
        require!(escrow.state == EscrowState::Pending, EscrowError::InvalidState);
        escrow.state = EscrowState::Refunded;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(property_id: String, timeout_hours: u64)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    pub landlord: SystemAccount<'info>,
    pub token_mint: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = tenant,
        space = 8 + EscrowAccount::LEN,
        seeds = [b"betaman_escrow", property_id.as_bytes(), tenant.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    #[account(
        mut,
        seeds = [b"betaman_escrow", escrow.property_id.as_bytes(), tenant.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ConfirmViewing<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    #[account(
        mut,
        seeds = [b"betaman_escrow", escrow.property_id.as_bytes(), tenant.key().as_ref()],
        bump,
        constraint = escrow.state == EscrowState::Pending @ EscrowError::InvalidState
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[derive(Accounts)]
pub struct RefundIfTimeout<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    #[account(
        mut,
        seeds = [b"betaman_escrow", escrow.property_id.as_bytes(), tenant.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
}

#[account]
pub struct EscrowAccount {
    pub tenant: Pubkey,
    pub landlord: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub timeout_timestamp: i64,
    pub state: EscrowState,
    pub property_id: String,
}

impl EscrowAccount {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 1 + 4 + 200;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowState {
    Pending,
    Released,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is not in pending state")]
    InvalidState,
    #[msg("Timeout period has not been reached")]
    TimeoutNotReached,
}
