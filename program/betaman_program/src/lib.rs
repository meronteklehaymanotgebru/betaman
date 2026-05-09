use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

declare_id!("4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM");

#[program]
pub mod betaman_program {
    use super::*;

    /// Initialize escrow account per SRD section 3.3
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        property_id: String,
        timeout_hours: u64,
        property_metadata_uri: String,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.tenant = ctx.accounts.tenant.key();
        escrow.landlord = ctx.accounts.landlord.key();
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.amount = 0;
        escrow.timeout_timestamp = Clock::get()?.unix_timestamp + (timeout_hours as i64 * 3600);
        escrow.state = EscrowState::Pending;
        escrow.property_id = property_id;
        escrow.property_metadata_uri = property_metadata_uri;
        Ok(())
    }

    /// Deposit SPL tokens into escrow per SRD FR-07
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        // Transfer tokens from tenant to escrow PDA
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.tenant_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.tenant.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, amount)?;
        
        escrow.amount = amount;
        Ok(())
    }

    /// Confirm viewing and release funds per SRD FR-08, FR-10
    pub fn confirm_viewing(ctx: Context<ConfirmViewing>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Pending, EscrowError::InvalidState);
        
        // Transfer funds from escrow to landlord
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.landlord_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        
        // Sign with PDA seeds per SRD NFR-05
        let seeds = &[
            b"betaman_escrow",
            escrow.property_id.as_bytes(),
            escrow.tenant.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, escrow.amount)?;
        
        escrow.state = EscrowState::Released;
        
        // Emit event for SBT minting trigger per SRD FR-11
        emit!(ViewingConfirmed {
            tenant: escrow.tenant,
            landlord: escrow.landlord,
            property_id: escrow.property_id.clone(),
            amount: escrow.amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Auto-refund if timeout reached per SRD FR-09
    pub fn refund_if_timeout(ctx: Context<RefundIfTimeout>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;
        
        require!(
            clock.unix_timestamp > escrow.timeout_timestamp,
            EscrowError::TimeoutNotReached
        );
        require!(escrow.state == EscrowState::Pending, EscrowError::InvalidState);
        
        // Transfer funds back to tenant
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.tenant_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        
        let seeds = &[
            b"betaman_escrow",
            escrow.property_id.as_bytes(),
            escrow.tenant.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, escrow.amount)?;
        
        escrow.state = EscrowState::Refunded;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(property_id: String, timeout_hours: u64, property_metadata_uri: String)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    
    pub landlord: SystemAccount<'info>,
    
    #[account(mut)]
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
    
    #[account(mut)]
    pub tenant_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
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
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub landlord_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
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
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub tenant_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
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
    pub property_metadata_uri: String,
}

impl EscrowAccount {
    // LEN calculation: discriminator(8) + 5x Pubkey(32) + amount(8) + timestamp(8) + state(1) + 2x String(4+200)
    pub const LEN: usize = 8 + (5 * 32) + 8 + 8 + 1 + (4 + 200) + (4 + 200);
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

#[event]
pub struct ViewingConfirmed {
    pub tenant: Pubkey,
    pub landlord: Pubkey,
    pub property_id: String,
    pub amount: u64,
    pub timestamp: i64,
}