% Tower of Hanoi - pure logic solver
hanoi(0, _, _, _, []) :- !.
hanoi(N, From, To, Via, Moves) :-
    N > 0,
    N1 is N - 1,
    hanoi(N1, From, Via, To, UpperMoves),
    hanoi(N1, Via, To, From, LowerMoves),
    append(UpperMoves, [move(From, To)|LowerMoves], Moves).

solve(N) :-
    hanoi(N, a, c, b, Moves),
    write_json(Moves).

write_json(Moves) :-
    write('['),
    write_moves(Moves),
    write(']').

write_moves([]).
write_moves([move(F,T)|Rest]) :-
    format('{"from":"~w","to":"~w"}', [F, T]),
    ( Rest = [] -> true ; write(',') ),
    write_moves(Rest).