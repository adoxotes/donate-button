// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {FundMe} from "../src/FundMe.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";

contract DeployFundMe is Script {
    error DeployFundMe__FailedInit();

    FundMe public fundMe;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        address usdcAddress;
        if (block.chainid == 31337) {
            MockUSDC mockUsdc = new MockUSDC();
            usdcAddress = address(mockUsdc);
        } else {
            usdcAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        }

        fundMe = new FundMe(usdcAddress);

        vm.stopBroadcast();
    }
}
