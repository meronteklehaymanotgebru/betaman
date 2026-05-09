use anchor_lang::prelude::*;

declare_id!("8nsU4Z9vUHsQd7M5L6884awmrhnHAReFMAw2zoUR5f8v");

#[program]
pub mod betaman_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
