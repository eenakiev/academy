const Markdown = `## [Introduction](#introduction)


The goal of this article is to present an algorithm which can answer
many questions about behaviour of classes of addresses on the
blockchain. Here are some example questions that we would like to be
able to answer:

* What proportion of the transaction volume is speculative,
  i.e. related to exchanges?
* How much Ether is being transferred from all ICO team wallets to
  exchanges?
* What is more - money going from whales to exchanges, or money going
  from exchanges to whales?

To be able to answer questions like these we need to be able to track
traffic between different classes of addresses. Santiment keeps track
of ICO team wallets and of hot and cold exchange wallets. But those
lists of wallets in themselves are not sufficient. In practice many of
the transfers that interest us are performed using several
transactions. This is happening for technical reasons and it can
obscure the global picture.

Consider the following example: Alice just made a very successful ICO
and collected 10 ETH in her wallet. She wants to sell all this ETH for
USD on Bob's exchange. Assume that Alice's address is $A$ and Bob's
exchange hot wallet has address $B$. Normally Alice will not transfer
directly from $A$ to $B$. Instead Bob will create for her a deposit
address $D$. This address is controlled by Bob, but he knows that any
money deposited to $D$ will belong to Alice. So Alice then makes a
transaction of 10 ETH $A\to D$, and later Bob makes another
transaction (of almost 10 ETH) $D\to B$. The deposit address $D$ can
be used only once so it is not easy to detect such addresses on the
blockchain on time.

At Santiment we can find out the addresses $A$ and $B$. We can tag $A$
as an ICO address and $B$ as an exchange address. But if we just look
at the transfers we won't notice any direct transaction from $A$ to
$B$. Instead we will notice two transactions: one from an ICO address
to an unlabeled address, and another from an unlabeled address to an
exchange address. So we won't be able to detect what is the volume of
ICO money going to exchanges.

We will describe here an algorithm that will allow us to overcome this
problem. The main insight for the given example is that the transfers
$A \to D$ and $D \to B$ happen within a short timespan. So we will
attempt to track how a given amount moves between addresses when all
relevant transactions are happening within a short timespan. In our
case the money that went to $B$ came from $A$, so its path was
$ADB$. The first address of the path was for ICO funds and the last
was an exchange address. In our case there is a value associated to
this path, namely 10 ETH. With the algorithm that we describe below it
will be possible to estimate the total volume associated to paths
where the first address is an ICO address and the last is an exchange
address. This will give us an estimate how much ICO money is going to
exchanges.

To be able to do this we are going to modify the [transaction
stack](https://community.santiment.net/t/the-transaction-stack/36)
algorithm to track paths of coins.

We will assume that we are dealing with tracking Ether. However the
same method will also work for other assets like e.g. ERC20
tokens. With small modifications it can also be translated to
UTXO-based blockchains (like Bitcoin).

## [Definitions](#definitions)

### [Blocks, transactions and accounts](#blocks_txs_accounts)

Let $\mathbf{B}$ denote the set of all blocks, and let $\mathbf{T}$
denote time. For each block we have a timestamp function

$$
\mathrm{T}:\mathbf{B}\to\mathbf{T}
$$

Let $\mathbf{Tx}$ denote the set of all transactions. Each transaction
is assigned to a block, so we have a function

$$
\mathrm{B}:\mathbf{Tx}\to\mathbf{B}
$$

This means that we can associate a timestamp to each
transaction. Technically this timestamp is given by the function
$\mathrm{T}\circ \mathrm{B}$ but we will denote it again by
$\mathrm{T}$.

The set of blocks is totally ordered, and within each block the set of
transactions is totally ordered. This means that we have a total
ordering of $\mathbf{Tx}$ and we can just assume for simplicity that
the transactions there are numbered $0,1,2,\dots$. We can think of
transaction $0$ as the transaction which sets up the _genesis
block_. We will just identify the transactions with their number in
this ordering.

We will denote the set of all accounts by $\mathbf{A}$. At any point
in time an account has a balance. Actually the balance does not depend
on the timestamp, but on the current transaction. For transaction $n$
we can define a function

$$
\mathrm{bal}_n:\mathbf{A}\to\mathbf{R}
$$

which gives us the balance for each account after transaction $n$ has
been processed.

### [Address Paths and Classifications](#classifications)

Let $\mathcal{A}$ denote the free monoid generated by $\mathbf{A}$. In
other words, $\mathcal{A}$ is the set of all finite sequences of
addresses including the empty sequence. We will also call those
_paths_. The fact that $\mathcal{A}$ is a monoid simply means that we
have a binary operation on $\mathcal{A}$ which for any pair of paths
returns their concatenation.

It is impractical to track all paths of addresses. Instead we would
classify addresses into several categories. We would then attempt to
reduce the whole set of paths to a finite set which is somehow
constructed from those categories. In order to do that we need to be
able to map the concatenation operation into some similar operation
over those categories. Below we'll describe how to do this formally.

Let $\mathcal{C}$ be a monoid, and let $C:\mathbf{A}\to \mathcal{C}$
be a function. Since $\mathcal{A}$ is the free monoid over
$\mathbf{A}$, the map $C$ can be uniquely extended into a monoid
homomorphism:

$$
C:\mathcal{A}\to\mathcal{C}
$$

We will call the map $C$ a __classification map__ of $\mathbf{A}$. The
elements of $\mathcal{C}$ will be called __path classes__ or just
__classes__.

#### [Example](#example)

Let $\mathcal{C} = \{ 1, e, n, en, ne\}$. We can define a binary
operation $\times$ on $\mathcal{C}$ as follows:

$$
\begin{split}
1 \times x = x \times 1 = x\\
e \times e = e \times ne = en \times e = en \times ne = e\\
n \times n = n \times en = ne \times n= ne \times en = n\\
e \times n = e\times en = en \times n = en \times en = en\\
n \times e = n \times ne = ne \times e = ne \times ne = ne
\end{split}
$$

With this operation $\mathcal{C}$ becomes a monoid.

Let $C:\mathbf{A} \to \mathcal{C}$ be defined as follows:

$$
C: a \mapsto \left\{
\begin{array}{ll}
e, &\textrm{if $a$ is an exchange wallet,}\\
n, &\textrm{otherwise}
\end{array}
\right.
$$

This induces a map $C:\mathcal{A}\to\mathcal{C}$ whose meaning is the
following:

$$
C: p \mapsto \left\{
\begin{array}{ll}
1, &\textrm{if $p$ is the empty path,}\\
e, &\textrm{if $p$ starts at an exchange and ends at an exchange,}\\
n, &\textrm{if $p$ starts at a non-exchange and ends at a non-exchange,}\\
en, &\textrm{if $p$ starts at an exchange and ends at a non-exchange,}\\
ne &\textrm{if $p$ starts at a non-exchange and ends at an exchange.}
\end{array}
\right.
$$

You can see how we can express arbitrary conditions on the paths using
monoids and classification maps.

#### Class functions

We are intereted in tracking volumes that travel along different class
paths. A certain amount arriving at address $a$ might have arrived
along different path classes. To express the distribution of the
volume along path classes we will have to use a mapping from the
available path classes to the real numbers. In this section we define
those mappings formally and describe some structures on them that
we'll use later.

So we define the set of __finitely supported
class functions__ (or __class functions__) as follows:

$$
\mathcal{C}^\vee := \{ f:\mathcal{C}\to \mathbf{R} \textrm{, such that $f$ has finite support}\}
$$

Let us define for every class $c\in \mathcal{C}$ the indicator class
function $\sigma_c$:

$$
\sigma_c (c') = \left\{
\begin{array}{ll}
1, &\text{if } c' = c,\\
0, &\text{if } c' \neq c.
\end{array}
\right.
$$

Then every class function $f$ can be represented as a linear
combination of indicator functions:

$$
f = \sum_{c\in\mathcal{C}} f(c)\sigma_c
$$

The fact that $f$ is finitely-supported implies that the coefficients
$f(c)$ are non-zero for only finitely many classes $c$. Note that if
$\mathcal{C}$ is finite of size $k$, then the set of the class
functions is just a $k$-dimensional vector space.

The fact that $\mathcal{C}$ is a monoid introduces certain structures
on the set of class functions. We will need later one such
structure. Each class $c$ induces a right action on the set of class
functions as follows:

$$
c: f \mapsto f^c, \text{ where }
f^c := \sum_{c'\in\mathcal{C}}f(c')\sigma_{c'c}
$$


### Account model

The original transaction stack account model allows us to split at any
point in time the whole Ethereum pool into segments. We will first
present the original formalism here and then will describe the
modification which is require for our purposes.

The Ethereum in each account is split into segments according to the
block number at which the given segment of Ethereum arrived in the
given account. So at each account $a\in\mathbf{A}$ we have a set
$\{(n_1,v_1),\dots,(n_k,v_k)\}$, where $n_1,\dots,n_k$ are the
transactions at which the corresponding values $v_1,\dots,v_k$ arrived
at the given address. We will call those transactions, the
__originating transaction__ for a given segment. The sum
$v_1+\cdots+v_k$ will be equal to the current balance of the given
account.

It follows that for each transaction $n$ we have a set

$$
S_n \subset \mathbf{A}\times \mathbf{Tx}\times \mathbf{R}
$$

which describes the segmentation after transaction $n$ has been
processed.

For every $s\in S_n$ we can define functions $\mathrm{A}(s)$,
$\mathrm{Tx}(s)$, $\mathrm{V}(s)$ which give us the respective
account, originating transaction and value. We can also define a
timestamp function $\mathrm{T}(s) := \mathrm{T}(\mathrm{Tx}(s))$.

The specific account model gives us an iterative process which using
$S_n$ and transaction $n+1$ allows us to compute $S_{n+1}$. Usually
the difference between $S_{n+1}$ and $S_n$ is relatively small - one
or more elements from $S_n$ are deleted and then one or more (maximum
two for the transaction stack model) are added. Let's make the
following definitions:

$$
\mathrm{Del}_{n+1} := S_n \setminus S_{n+1} \  \text{- Elements that need to be deleted from $S_n$} \\
\mathrm{Add}_{n+1}:= S_{n+1} \setminus S_n \  \text{- Elements that need to be added to $S_n$} \\
\mathrm{Diff}_{n+1}:= (\mathrm{Del}_{n+1}, \mathrm{Add}_{n+1})
$$

In order to compute $S_{n+1}$ in practice we compute
$\mathrm{Diff}_{n+1}$ from $S_n$ and the transaction $n+1$ and then we
apply it to $S_n$ to get the result. We shall call $\mathrm{Diff}_n$
the __model update at transaction $n$__

### Augmented account model

Next we will describe how to add information to the segments in $S_n$
which tracks the history of the coins and how this information can be
updated with each transaction. Let us from now on fix a
_classification_ $\mathrm{C}:\mathbf{A}\to\mathcal{C}$. For any given
segment $s$ the coins have arrived to $s$ using paths from different
classes. For each path class there is a certain amount of coins that
have arrived via paths from this class. The sum of those amount over
all path classes will be equal to $V(s)$ -- the total amount contained
in the segment $s$.

We will only be interetend in tracking short-term paths. For that
reason we will have to restrict the duration over which we need to
keep the history. Let us then fix such a duration $\Delta$. In
practice this duration will usually be just 24 hours.

To formalise this idea we define the __augmented account model__ to
consist of the duration $\Delta$ and a pair $(S_n, H_n)$ for every
transaction $n$, where $S_n$ is defined as before and $H_n$ is a
function

$$
H_n:S_n\to \mathcal{C}^\vee,
$$

such that for every $s\in S_n$ we have

$$
\sum_{c\in\mathcal{C}}H_n(s)(c) = \mathrm{V}(s)
$$

We will call $H_n$ a __history function__.

For every $s$, $H_n(s)$ records the history of the coins that arrived
to the segment $s$. There is a trivial history function which we can
construct from $S_n$, and which contains no history data at
all. Namely we can define

$$
H^{triv}(s)(c) = \left\{
\begin{array}{ll}
V(s), &\text
{if } c = \mathrm{C}(\mathrm{A}(s))\\
0, & \text{otherwise}
\end{array}
\right.
$$

We will next show how from $H_n$ and the object $\mathrm{Diff}_{n+1}$
defined above we can construct $H_{n+1}$.

Recall that we are only interested in the short-term history. We do
not care if for example the coins in a certain segment spent some time
in an exchange several months ago. So we must introduce a mechanism
for _forgetting_ old history. The way we do this forgetting is as
follows: Let's say that we need now to compute $H_{n+1}$ using
$H_n$. Instead of using $H_n$ directly we are going to replace it with
the following function:

$$
H'_n(s) := \left\{
\begin{array}{ll}
H^{triv}(s), &\text{if } T(n+1)-T(s) \geq \Delta\\
H_n(s), &\text{otherwise}
\end{array}
\right.
$$

So if the segment $s$ is sufficiently old, we will simply forget its
history.

Let us define the following subsets of $\mathrm{Add}_{n+1}$:

$$
\begin{split}
\mathrm{New}_{n+1} &:= \{s\in \mathrm{Add}_{n+1} : \mathrm{Tx}(s) = n+1\}\\
\mathrm{Rem}_{n+1} &:= \mathrm{Add}_{n+1} \setminus \mathrm{New}_{n+1}
\end{split}
$$

Namely $\mathrm{New}_{n+1}$ are all the segments containing the newly
transferred coins in the recepient account(s) and $\mathrm{Rem}_{n+1}$
contain remainder from old segments which were not fully spent. Note
that according to the way the transaction stack model works, for every
$s\in\mathrm{Rem}_{n+1}$ there is a unique segment $pred(s)\in S_n$
such that $\mathrm{Tx}(pred(s)) = \mathrm{Tx}(s)$ and
$\mathrm{A}(pred(s)) = \mathrm{A}(s)$. In that case $pred(s)$ is a
segment which was not fully spent, and whose remainder is left in $s$.

Let

$$
\begin{split}
Tot &:= \sum_{s\in\mathrm{New}_{n+1}}\mathrm{V}(s)\\
H^{Del} &:= \sum_{s\in Del_{n+1}} H'_n(s) \\
H^{Rem}(s) &:= \frac{\mathrm{V}(s)}{\mathrm{V}(pred(s))}H'_n(pred(s))\\
H &:= H^{Del} - \sum_{s\in \mathrm{Rem}_{n+1}}H^{Rem}(s)
\end{split}
$$

Here $H$ is a class function. Recall that for class functions we had
defined a right action by the classes. Then we can set

$$
H_{n+1}(s) := \left\{
\begin{array}{ll}
H_n'(s), &\text{if } s\in S_n\cap S_{n+1},\\
H^{Rem}(s), &\text{if } s\in \mathrm{Rem}_{n+1},\\
\frac{\mathrm{V}(s)}{Tot}H^{\mathrm{C}(\mathrm{A}(s))}, &\text{if } s\in \mathrm{New}_{n+1}.
\end{array}
\right.
$$

(For the stack account model there is exactly one segment in
$\mathrm{New}_{n+1}$ and at most one segment in $\mathrm{Rem}_{n+1}$
which can simplify the formulas above. But for blockchains like
Bitcoin where one transaction can have multiple inputs and outputs
those sets can be larger.)

The meaning of the monoid action in the last line of the formula is
the following: We take the history of the segments that were spent and
to each created new segment we assign this history after we have
appended the address of the segment at the end of all historical
paths.


####  Alternative augmented model

What would happen if we didn't use the forgetful function $H'$ in the
above definitions? In that case the history function $H_n(s)$ will
contain older history for the coins in $s$. For example if we use the
trivial history function at transaction 0, and then we update the
history functions as given above, $H_n(s)$ will contain the complete
history of the coins in $s$ since their creation. We can however also
use this alternative model for tracking short-term history. For
example we can start with the trivial history function at the start of
a given day and proceed with the history updates until the day is
finished. At the end the history functions for the resulting segments
will contain only information for paths of coins that moved within
that day.


### Path volume metrics

We are not really interested in the history functions themselves but
rather would to track the volumes across the whole network. To do this
we define the following __path volume__ metric as the sum of the history
functions over all recent segments:

$$
PV_n := \sum_{s\in S_n \\ T(n) - T(s) < \Delta} H_n(s)
$$

The path volume metric is a class function which to every class path
associates the total volume of coins that travelled along that path.


### Computing the path volume metrics

We are next going to describe an efficient algorithm for computing
$PV_n$. The basic algorithm is the same as the algorithm for
[computing the token
circulation](https://community.santiment.net/t/the-transaction-stack/36/4)

Let us fix $t=T(n)$. We have

$$
PV_n = \sum_{t-\Delta < \tau \leq t}f_n(\tau)
$$

where

$$
f_n(\tau) := \sum_{s\in S_n \\ T(s) = \tau} H_n(s)
$$

#### Theorem
Let

$$
g_{n+1}(\tau) := -\sum_{s\in\mathrm{Del}_{n+1} \\ T(s)=\tau} H_n(s)
     + \sum_{s\in \mathrm{Add}_{n+1} \\ T(s) = \tau} H_{n+1}(s)
$$

Let $\delta := T(n+1)-T(n)$. Then for $\tau > t+\delta - \Delta$ we have

$$
f_{n+1} = f_n + g_{n+1}.
$$






#### Theorem

Let $\delta := T(n+1) - T(n)$. The following recursive formula holds
for the path volume metric:

$$
PV_{n+1} = PV_{n} - \sum_{t-\Delta <\tau \leq t+\delta-\Delta} f_n(\tau)
    - \sum_{s\in\mathrm{Del}_{n+1} \\ t+\delta - \Delta < \tau \leq t} H_n(s)
    + \sum_{s\in\mathrm{Add}_{n+1} \\ t+\delta - \Delta < \tau \leq t+\delta} H_{n+1}(s)
$$
`

export default Markdown
