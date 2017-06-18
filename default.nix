{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

let
  npmInputs = import ./npm-env.nix {
    inherit pkgs system nodejs;
    packages = [
      "typescript" 
      { webpack = "2.6.1"; }
      { karma = "1.7.0"; }
      { jsdom = "11.0.0"; }
      { "karma-jsdom-launcher" = "6.1.2"; }
      { "karma-webpack" = "2.0.3"; }
      { "karma-qunit" = "1.2.1"; }
    ];
  };
in

with pkgs;
stdenv.mkDerivation {
  name = "kamo-reducers";
  buildInputs = npmInputs;
}
