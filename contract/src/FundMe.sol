// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FundMe {
    error FundMe__NotOwner();
    error FundMe__NotEnoughFunds();
    error FundMe__TransferFailed();

    // USDC uses 6 decimals. 50 * 10^6 = 50 USDC
    uint256 public constant MINIMUM_USDC = 1 * 1e6;
    address public immutable i_owner;
    // Mainnet USDC Address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48
    IERC20 public immutable usdcToken;

    mapping(address => uint256) public addressToAmountFunded;
    address[] public s_funders;

    constructor(address _usdcAddress) {
        i_owner = msg.sender;
        usdcToken = IERC20(_usdcAddress);
    }

    /**
     * @notice Funds the contract with USDC
     * @dev User must call usdc.approve(address(this), amount) before calling this
     */
    function fund(uint256 _amount) public {
        if (_amount < MINIMUM_USDC) revert FundMe__NotEnoughFunds();

        // Transfer USDC from user to this contract
        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        if (!success) revert FundMe__TransferFailed();

        if (addressToAmountFunded[msg.sender] == 0) {
            s_funders.push(msg.sender);
        }
        addressToAmountFunded[msg.sender] += _amount;
    }

    function withdraw() public {
        if (msg.sender != i_owner) revert FundMe__NotOwner();

        // Reset funding mapping
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);

        // Transfer all USDC held by contract to owner
        uint256 balance = usdcToken.balanceOf(address(this));
        bool success = usdcToken.transfer(i_owner, balance);
        if (!success) revert FundMe__TransferFailed();
    }

    // Native ETH sent to this contract will be rejected as there is no 'payable' receive/fallback
}
