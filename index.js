$(() => {

    let Web3 = require("web3");
    let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    let abi = require('./abi').abi;
    let etherscanTxApiRoute = "api?module=account&action=txlist&startblock=0&endblock=99999999&sort=asc&address=";
    let request = require("superagent");
    const nullToken = "0x0000000000000000000000000000000000000000000000000000000000000000";
    let gAllContractsTokens = {};
    //array of tokens containing each token balance in a given contract
    gAllContractsTokens.tokens = [];
    //array of indices mapping to each token array
    gAllContractsTokens.indices = [];
    //the contract holding each token and indices
    gAllContractsTokens.contracts = [];
    //for each contract, there is an array of tokens and indices

    if (typeof window.web3 !== 'undefined')
    {
        web3 = new Web3(window.web3.currentProvider);
        console.log("injected provider used");
        web3.eth.defaultAccount = web3.eth.coinbase;
        try
        {
            window.web3.currentProvider.enable();
        }
        catch(e)
        {
            //do nothing, just don't halt the program
            console.log("backward incompatible web3 with privacy mode + " + e);
        }
        init();
    }
    else
    {
        alert("no injected provider found, using localhost:8545, please ensure your local node is running " +
            "and rpc and rpccorsdomain is enabled");
        init();
    }

    function getEtherscanLink(cb)
    {
        web3.version.getNetwork((err, networkId) =>
        {
            if (networkId == 3) cb("https://ropsten.etherscan.io/");
            else if (networkId == 4) cb("https://rinkeby.etherscan.io/");
            else if (networkId == 42) cb("https://kovan.etherscan.io/");
            else cb("https://api.etherscan.io/");
        });
    }

    function init()
    {
        getContractsOfUser(web3.eth.coinbase, (contracts) =>
        {
            if(contracts.length == 0)
            {
                alert("No ERC875 tokens found");
                return;
            }
            for(let contract of contracts)
            {
                getIsERC875(contract, (err, data) =>
                {
                    if(err) return;
                    //contract div
                    $('<div/>', { id: contract.address, class: '' }).appendTo('#contractObjects');
                    if(data == true)
                    {
                        gAllContractsTokens.contracts.push(contract);
                        //appends the label for the contract address, this is the parent and each token goes under it
                        $('<div>', { id: contract.address, value: contract.address });
                        getTokensFromContract(contract, web3.eth.coinbase, (tokenObj) =>
                        {
                            gAllContractsTokens.indices.push(tokenObj.indices);
                            gAllContractsTokens.tokens.push(tokenObj.balance);
                            spawnElementsWithTokens(tokenObj);
                        });
                    }
                });
            }
        });
    }

    function spawnElementsWithTokens(tokenObj)
    {
        let tokensForContract = {};
        tokensForContract.address = contract.address;
        tokensForContract.tokens = [];

        for(let token of tokenObj.tokens)
        {
            let tokenBundle = groupTokenByNumberOfOccurances(token, tokenObj);
            tokensForContract.tokens.push(tokenBundle);
            $('<label>', { id: 'tokenBundle', value: tokenBundle.token })
                .appendTo('#' + contract.address);
            $('<select>', { id: "selectTokenQuantity" + tokenBundle.token})
                .appendTo('#' + contract.address);
            $("<button>", { id: "transferToken" + tokenBundle.token, value:"transfer" })
                .appendTo("#" + contract.address);
            for(let index of tokenBundle.tokens)
            {
                //allow the user to choose how much of each unique token they want to transfer
                $("<option>", { value: index }).appendTo("#selectTokenQuantity" + tokenBundle.token);
            }
        }
    }

    function groupTokenByNumberOfOccurances(token, tokens)
    {
        let numberOfOccurances = 0;
        for(let i = 0; i < tokens.length; i++)
        {
            if(token == tokens[i])
            {
                numberOfOccurances++;
            }
        }
        return { token: token, amount: numberOfOccurances }
    }

    function getContractsOfUser(userAddress, cb)
    {
        let contracts = [];
        //get all the contracts from transaction list of user
        getEtherscanLink((link) => {
            request.get(link + etherscanTxApiRoute + userAddress, (err, data) =>
            {
                if(err) throw err;
                let transactions = data.body.result;
                for (let tx of transactions)
                {
                    if(tx.input != "")
                    {
                        //make sure contract hasn't been added already
                        for(let contract of contracts)
                        {
                            //if added then forget about it
                            if(contract.address == tx.to)
                            {
                                break;
                            }
                        }
                        //push instantiated web3 contract instance
                        contracts.push(web3.eth.contract(abi).at(tx.to));
                    }
                }
                cb(contracts);
            });
        });
    }

    function getTokensFromContract(contract, addressOfUser, cb)
    {
        let tokenObject = {};
        contract.balanceOf(addressOfUser, (err, data) =>
        {
            if(err) cb(err);
            let indices = [];
            for(let index in data)
            {
                indices.push(index);
                if(data[index] == nullToken)
                {
                    data.remove(index);
                }
            }
            tokenObject.indices = indices;
            tokenObject.balance = data;
            cb(tokenObject);
        });
    }

    function getIsERC875(contract, cb)
    {
        contract.isStormBirdContract((err, data) =>
        {
            if(err) cb(false);
            else cb(data);
        });
    }

    //maps to any transfer button call
    $(":button").click(() => {
        //TODO get the correct button by mapping to contract address
        //TODO get correct token input and amount from button click
        //instantiate contract and call transfer
    });

    function transfer(contract, to, tokenIndices)
    {
        contract.transfer(to, tokenIndices, (err, data) =>
        {
            alert(err, data);
        });
    }

});