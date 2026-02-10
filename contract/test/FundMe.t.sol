// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {FundMe} from "../src/FundMe.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract FundMeTest is Test {
    FundMe fundMe;
    MockUSDC mockUsdc;

    address USER = makeAddr("user");
    uint256 constant STARTING_BALANCE = 1000 * 1e6; // 1000 USDC
    uint256 constant SEND_VALUE = 100 * 1e6; // 100 USDC

    function setUp() public {
        mockUsdc = new MockUSDC();
        fundMe = new FundMe(address(mockUsdc));
        mockUsdc.mint(USER, STARTING_BALANCE);
    }

    function testMinimumUSDC() public view {
        assertEq(fundMe.MINIMUM_USDC(), 1 * 1e6);
    }

    function testFundFailsWithoutEnoughUSDC() public {
        vm.prank(USER);
        // vm.expectRevert(FundMe.NotEnoughFunds.selector);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector,
                address(fundMe), // spender
                0, // current allowance
                10 * 1e6 // needed
            )
        );
        fundMe.fund(10 * 1e6); // Sending only 10
    }

    function testFundFailsWithoutAllowance() public {
        vm.prank(USER);
        // We didn't call mockUsdc.approve(), so it should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector,
                address(fundMe), // spender
                0, // current allowance
                SEND_VALUE // needed
            )
        );
        fundMe.fund(SEND_VALUE);
    }

    function testFundUpdatesDataStructures() public {
        vm.startPrank(USER);
        mockUsdc.approve(address(fundMe), SEND_VALUE);
        fundMe.fund(SEND_VALUE);
        vm.stopPrank();

        uint256 amountFunded = fundMe.addressToAmountFunded(USER);
        assertEq(amountFunded, SEND_VALUE);
        assertEq(fundMe.s_funders(0), USER);
    }

    function testOnlyOwnerCanWithdraw() public {
        vm.startPrank(USER);
        mockUsdc.approve(address(fundMe), SEND_VALUE);
        fundMe.fund(SEND_VALUE);

        vm.expectRevert(FundMe.FundMe__NotOwner.selector);
        fundMe.withdraw();
        vm.stopPrank();
    }

    function testWithdrawWithASingleFunder() public {
        // Arrange
        vm.startPrank(USER);
        mockUsdc.approve(address(fundMe), SEND_VALUE);
        fundMe.fund(SEND_VALUE);
        vm.stopPrank();

        uint256 startingOwnerBalance = mockUsdc.balanceOf(fundMe.i_owner());
        uint256 startingFundMeBalance = mockUsdc.balanceOf(address(fundMe));

        // Act
        vm.prank(fundMe.i_owner());
        fundMe.withdraw();

        // Assert
        uint256 endingOwnerBalance = mockUsdc.balanceOf(fundMe.i_owner());
        uint256 endingFundMeBalance = mockUsdc.balanceOf(address(fundMe));

        assertEq(endingFundMeBalance, 0);
        assertEq(
            startingFundMeBalance + startingOwnerBalance,
            endingOwnerBalance
        );
    }
}
