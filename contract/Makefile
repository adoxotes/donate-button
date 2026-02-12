-include .env

# Config
RPC_URL := http://127.0.0.1:8545
CHAIN_ID := 31337
EXTRACT_INT := grep -Eo '[0-9]+' | head -1

owner ?= Wallets/Anvil0
client ?= Wallets/Metamask
amount ?= 0.0

.PHONY: deploy get-address balance fund withdraw wallet-balance fund-metamask owner-key

# Dry-run
deploy:
	@forge script script/FundMe.s.sol:DeployFundMe \
		--rpc-url $(RPC_URL) \
		--private-key $$(pass $(owner)) \
		--broadcast
	@$(MAKE) save-addresses

# Extract contract addresses from broadcast log and save to local hidden files
save-addresses:
	@mkdir -p .build
	@jq -r '.transactions[] | select(.contractName == "FundMe") | .contractAddress' broadcast/FundMe.s.sol/$(CHAIN_ID)/run-latest.json | head -n 1 > .build/contract_address
	@jq -r '.transactions[] | select(.contractName == "MockUSDC") | .contractAddress' broadcast/FundMe.s.sol/$(CHAIN_ID)/run-latest.json | head -n 1 > .build/usdc_address
	@echo "FundMe saved to .build/contract_address: $$(cat .build/contract_address)"
	@echo "MockUSDC saved to .build/usdc_address: $$(cat .build/usdc_address)"

# Helper to see the address
get-address:
	@cat .build/contract_address

get-usdc-address:
	@cat .build/usdc_address

# Ways to interact with the contract
balance:
	@USDC_ADDR=$$(cat .build/usdc_address); \
	FUNDME_ADDR=$$(cat .build/contract_address); \
	BALANCE=$$(cast call $$USDC_ADDR "balanceOf(address)(uint256)" $$FUNDME_ADDR | $(EXTRACT_INT)); \
	echo "FundMe USDC Balance: $$(echo "scale=6; $$BALANCE / 1000000" | bc) USDC"

# Fund requires approval first
fund:
	@USDC_ADDR=$$(cat .build/usdc_address); \
	FUNDME_ADDR=$$(cat .build/contract_address); \
	AMOUNT_RAW=$$(echo "$(amount) * 1000000" | bc | $(EXTRACT_INT)); \
	echo "Approving $$AMOUNT_RAW units of USDC..."; \
	cast send $$USDC_ADDR "approve(address,uint256)" $$FUNDME_ADDR $$AMOUNT_RAW --private-key $$(pass $(owner)); \
	echo "Funding FundMe..."; \
	cast send $$FUNDME_ADDR "fund(uint256)" $$AMOUNT_RAW --private-key $$(pass $(owner))

withdraw:
	@cast send $$(cat .build/contract_address) "withdraw()" \
		--private-key $$(pass $(owner))

wallet-balance:
	@ADDR=$$(cast wallet address --private-key $$(pass $(owner))); \
	USDC_ADDR=$$(cat .build/usdc_address); \
	BALANCE=$$(cast call $$USDC_ADDR "balanceOf(address)(uint256)" $$ADDR | $(EXTRACT_INT)); \
	echo "Wallet USDC Balance: $$(echo "scale=6; $$BALANCE / 1000000" | bc) USDC"

mint-usdc:
	@ADDR=$$(cast wallet address --private-key $$(pass $(owner))); \
	USDC_ADDR=$$(cat .build/usdc_address); \
	AMOUNT_RAW=$$(echo "$(amount) * 1000000" | bc | $(EXTRACT_INT)); \
	cast send $$USDC_ADDR "mint(address,uint256)" $$ADDR $$AMOUNT_RAW \
	--private-key $$(pass $(owner)) \
	--rpc-url $(RPC_URL)

fund-metamask:
	@CLIENT_ADDR=$$(pass $(client)); \
	echo "Funding Client with 1 ETH..."; \
	cast send $$CLIENT_ADDR --value 1ether --rpc-url $(RPC_URL) --private-key $$(pass $(owner))

mint-usdc-metamask:
	@USDC_ADDR=$$(cat .build/usdc_address); \
	AMOUNT_RAW=$$(echo "$(amount) * 1000000" | bc | $(EXTRACT_INT)); \
	echo "Funding Client with $$amount USDC..."; \
	cast send $$USDC_ADDR "mint(address,uint256)" $$(pass $(client)) $$AMOUNT_RAW --rpc-url $(RPC_URL) --private-key $$(pass $(owner))
