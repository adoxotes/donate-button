-include .env

# Configuration
RPC_URL    := http://127.0.0.1:8545
CHAIN_ID   := 31337
BUILD_DIR  := .build
LATEST_LOG := broadcast/FundMe.s.sol/$(CHAIN_ID)/run-latest.json

# Extracting first integer from hex/string output
EXTRACT_INT := grep -Eo '[0-9]+' | head -1

# Default values for parameters
owner  ?= Wallets/Anvil0
client ?= Wallets/Metamask
amount ?= 0.0

# Helpers
GET_FUNDME = $(shell cat $(BUILD_DIR)/contract_address 2>/dev/null)
GET_USDC   = $(shell cat $(BUILD_DIR)/usdc_address 2>/dev/null)
GET_PASS   = $(shell pass $(1))
TO_6_DEC   = $(shell echo "$(1) * 1000000" | bc | $(EXTRACT_INT))

.PHONY: help deploy save-addresses get-address balance fund withdraw \
        wallet-balance fund-metamask mint-usdc mint-usdc-metamask

help:
	@echo "Usage: make <target> [amount=0.1] [owner=Wallets/Anvil0]"
	@echo ""
	@echo "Deployment"
	@echo "  deploy             Deploy contracts and save addresses"
	@echo ""
	@echo "Inspection"
	@echo "  get-addresses      Show FundMe contract address"
	@echo "  contract-balance   Show FundMe USDC balance"
	@echo "  owner-balance      Show owner's USDC balance"
	@echo ""
	@echo "Interactions"
	@echo "  fund               Approve and fund FundMe (uses amount)"
	@echo "  withdraw           Withdraw all funds from FundMe"
	@echo "  mint-usdc-owner    Mint USDC to owner (uses amount)"
	@echo "  fund-client        Send 1 ETH to client wallet"
	@echo "  mint-usdc-client   Mint USDC to client (uses amount)"

# Deployment
deploy:
	@forge script script/FundMe.s.sol:DeployFundMe \
		--rpc-url $(RPC_URL) \
		--private-key $(call GET_PASS,$(owner)) \
		--broadcast
	@$(MAKE) save-addresses

save-addresses:
	@mkdir -p $(BUILD_DIR)
	@jq -r '.transactions[] | select(.contractName == "FundMe") | .contractAddress' $(LATEST_LOG) | head -n 1 > $(BUILD_DIR)/contract_address
	@jq -r '.transactions[] | select(.contractName == "MockUSDC") | .contractAddress' $(LATEST_LOG) | head -n 1 > $(BUILD_DIR)/usdc_address
	@echo "Addresses saved to $(BUILD_DIR)/"

# Inspection
get-addresses:
	@echo "FundMe: $(GET_FUNDME)"
	@echo "USDC:   $(GET_USDC)"

contract-balance:
	@BALANCE=$$(cast call $(GET_USDC) "balanceOf(address)(uint256)" $(GET_FUNDME) | $(EXTRACT_INT)); \
	echo "FundMe USDC Balance: $$(echo "scale=6; $$BALANCE / 1000000" | bc) USDC"

owner-balance:
	@ADDR=$$(cast wallet address --private-key $(call GET_PASS,$(owner))); \
	BALANCE=$$(cast call $(GET_USDC) "balanceOf(address)(uint256)" $$ADDR | $(EXTRACT_INT)); \
	echo "Wallet USDC Balance: $$(echo "scale=6; $$BALANCE / 1000000" | bc) USDC"

# Interactions
fund:
	@echo "Approving and Funding $(amount) USDC..."
	@cast send $(GET_USDC) "approve(address,uint256)" $(GET_FUNDME) $(call TO_6_DEC,$(amount)) --private-key $(call GET_PASS,$(owner))
	@cast send $(GET_FUNDME) "fund(uint256)" $(call TO_6_DEC,$(amount)) --private-key $(call GET_PASS,$(owner))

withdraw:
	@cast send $(GET_FUNDME) "withdraw()" --private-key $(call GET_PASS,$(owner))

mint-usdc-owner:
	@ADDR=$$(cast wallet address --private-key $(call GET_PASS,$(owner))); \
	cast send $(GET_USDC) "mint(address,uint256)" $$ADDR $(call TO_6_DEC,$(amount)) \
		--private-key $(call GET_PASS,$(owner)) --rpc-url $(RPC_URL)

fund-client:
	@echo "Funding $(client) with 1 ETH..."
	@cast send $(call GET_PASS,$(client)) --value 1ether --rpc-url $(RPC_URL) --private-key $(call GET_PASS,$(owner))

mint-usdc-client:
	@echo "Minting $(amount) USDC to $(client)..."
	@cast send $(GET_USDC) "mint(address,uint256)" $(call GET_PASS,$(client)) $(call TO_6_DEC,$(amount)) \
		--rpc-url $(RPC_URL) --private-key $(call GET_PASS,$(owner))
